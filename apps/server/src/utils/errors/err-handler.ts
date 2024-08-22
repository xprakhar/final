import { StatusCodes } from 'http-status-codes';

import { ZodError, ZodIssueCode } from 'zod';
import { logger } from '../logger';
import type { Request, Response } from 'express';
import { HttpError } from './errors';

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
    }
    prodError(err as HttpError, res);
  }
};
