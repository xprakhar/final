import { StatusCodes } from 'http-status-codes';
import { MongoServerError } from 'mongodb';
import { ZodError, ZodIssueCode } from 'zod';
import { logger } from './logger';
import type { Request, Response } from 'express';
import {
  JWSInvalid,
  JWSSignatureVerificationFailed,
  JWTClaimValidationFailed,
  JWTExpired,
} from 'jose/errors';

export class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

const dbErrorHandler = (err: MongoServerError): HttpError => {
  let message = 'A database error occurred';
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;

  switch (err.code) {
    case 11000:
      // Duplicate Key Error
      // Occurs when a unique index constraint is violated (e.g., attempting to insert a duplicate value in a field with a unique constraint).
      const field = Object.keys(err.keyValue)[0];
      message = `Duplicate key error: ${field} already exists.`;
      statusCode = StatusCodes.CONFLICT;
      break;

    case 121:
      // Document Validation Failure
      // Occurs when a document doesn't match the schema requirements.
      message = `Document validation failed: ${err.errmsg || 'Invalid data'}`;
      statusCode = StatusCodes.BAD_REQUEST;
      break;

    case 66:
      // Immutable Field Update Error
      // Occurs when there's an attempt to update a field that cannot be modified after the document is created.
      message = `Attempted to update an immutable field: ${err.errmsg || 'Operation not allowed'}`;
      statusCode = StatusCodes.BAD_REQUEST;
      break;

    case 2:
      // Bad Value Error
      // A general error for when an invalid value is passed to MongoDB, such as an unsupported operation or type.
      message = `Bad value error: ${err.errmsg || 'Invalid value provided'}`;
      statusCode = StatusCodes.BAD_REQUEST;
      break;

    case 50:
      // Exceeded Time Limit
      // Occurs when an operation exceeds the allowed execution time (e.g., a query running too long).
      message = `Operation exceeded time limit: ${err.errmsg || 'Query took too long'}`;
      statusCode = StatusCodes.REQUEST_TIMEOUT;
      break;

    case 112:
      // Write Conflict
      // Occurs when a write operation is aborted due to conflicts with another operation.
      message = `Write conflict: ${err.errmsg || 'Write operation aborted due to conflict'}`;
      statusCode = StatusCodes.CONFLICT;
      break;

    case 48:
      // Namespace Not Found
      // Occurs when a requested collection or database does not exist.
      message = `Namespace not found: ${err.errmsg || 'Collection or database does not exist'}`;
      statusCode = StatusCodes.NOT_FOUND;
      break;

    case 13:
      // Unauthorized Error
      // Occurs when the operation lacks the necessary permissions.
      message = `Unauthorized: ${err.errmsg || 'Permission denied'}`;
      statusCode = StatusCodes.FORBIDDEN;
      break;

    default:
      // General Database Error
      // Handles any other MongoDB errors that don't match the specific cases above.
      message = `MongoDB Error: ${err.errmsg || 'An unknown database error occurred'}`;
  }

  return new HttpError(statusCode, message);
};

const validationErrorHandler = (err: ZodError): HttpError => {
  const formattedIssues = err.issues.map(issue => {
    let message = '';

    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        message = `Expected ${issue.expected}, received ${issue.received} at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${issue.keys.join(', ')} at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input for union type at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value at ${issue.path.join('.')}, expected one of: ${issue.options.join(', ')}`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.too_small:
        message = `Value too small at ${issue.path.join('.')}, minimum is ${issue.minimum}${issue.type === 'string' ? ' characters' : ''}`;
        break;
      case ZodIssueCode.too_big:
        message = `Value too large at ${issue.path.join('.')}, maximum is ${issue.maximum}${issue.type === 'string' ? ' characters' : ''}`;
        break;
      case ZodIssueCode.custom:
        message = `Custom validation error at ${issue.path.join('.')}: ${issue.message}`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection types are invalid at ${issue.path.join('.')}`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Value is not a multiple of ${issue.multipleOf} at ${issue.path.join('.')}`;
        break;
      default:
        message = `Validation error at ${issue.path.join('.')}: ${issue.message}`;
    }

    return message;
  });

  const fullMessage = formattedIssues.join(', ');
  return new HttpError(StatusCodes.BAD_REQUEST, fullMessage);
};

// New handler for jose errors
const joseErrorHandler = (err: Error): HttpError => {
  let message = 'An authentication error occurred';
  let statusCode = StatusCodes.UNAUTHORIZED;

  if (err instanceof JWTExpired) {
    message = 'JWT token has expired';
    statusCode = StatusCodes.UNAUTHORIZED;
  } else if (err instanceof JWSSignatureVerificationFailed) {
    message = 'JWT signature verification failed';
    statusCode = StatusCodes.UNAUTHORIZED;
  } else if (err instanceof JWSInvalid) {
    message = 'Invalid JWT';
    statusCode = StatusCodes.UNAUTHORIZED;
  } else if (err instanceof JWTClaimValidationFailed) {
    message = `JWT claim validation failed: ${err.message}`;
    statusCode = StatusCodes.FORBIDDEN;
  }

  return new HttpError(statusCode, message);
};

const devError = (err: Error, res: Response) => {
  // Log the raw stack trace to the console
  logger.log('error', err.stack);

  const message = {
    status: 'failed',
    message: err.message,
    error: err,
    stack: err.stack || '',
  };

  logger.log('error', JSON.stringify(message, null, 2));

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(message);
};

// Error Handler For Production Environment
const prodError = (err: HttpError, res: Response) => {
  logger.log('error', err.message);
  return res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'failed',
    message: err.message,
  });
};

export default (err: Error, _req: Request | null, res: Response) => {
  if (process.env.NODE_ENV === 'development') {
    devError(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err instanceof ZodError) {
      err = validationErrorHandler(err);
    } else if (err instanceof MongoServerError) {
      err = dbErrorHandler(err);
    } else if (
      err instanceof JWTExpired ||
      err instanceof JWSSignatureVerificationFailed ||
      err instanceof JWSInvalid ||
      err instanceof JWTClaimValidationFailed
    ) {
      err = joseErrorHandler(err);
    }
    prodError(err as HttpError, res);
  }
};
