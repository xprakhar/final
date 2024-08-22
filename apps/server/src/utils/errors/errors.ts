// Authentication-related errors
export class AppError extends Error {
  code: number;
  reason?: string;

  constructor(code: number, reason?: string) {
    super(`Operation Failed: ${reason}`);
    this.code = code;
    this.reason = reason;
    this.name = this.constructor.name; // Ensure the name is set to the class name
    if (process.env.NODE_ENV === 'development') Error.captureStackTrace(this);
  }
}

export class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    if (process.env.NODE_ENV === 'development') Error.captureStackTrace(this);
  }
}

export enum ErrorCodes {
  BasicAuthFailed,
  TokenInvalid,
  TokenExpired,
  TokenRevoked,
  TokenClaimInvalid,
  DecryptionFailed,
  SignatureVerificationFailed,
  KeyNotFound,
  Unknown,
}
