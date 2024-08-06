import { formatError } from './helpers';

interface ErrorRes {
  name: string;
  message: string;
  stack: string;
  errorType: string;
  originalError: any;
  statusCode?: number;
  networkError?: boolean;
  responseData?: any;
}

export default class CustomError extends Error {
  originalError: any;
  errorType: string;
  statusCode?: number;
  responseData?: any;
  networkError?: boolean;

  constructor(
    message: string,
    originalError?: any,
    errorType: string = 'General',
    statusCode?: number,
    responseData?: any,
    networkError?: boolean,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.originalError = originalError;
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.responseData = responseData;
    this.networkError = networkError;

    Object.setPrototypeOf(this, new.target.prototype);

    // Capture the stack trace (excluding the constructor call)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  getOriginalError(): any {
    return this.originalError;
  }

  static identifyAndCreateErrorInstance(err: any): CustomError {
    const errMsg = formatError(err);
    if (err && err.status) {
      return new ApiError(errMsg, err, err.status, err.data);
    } else if (err.code) {
      return new NetworkError(errMsg, err);
    } else if (err instanceof SyntaxError || err instanceof ReferenceError || err instanceof TypeError) {
      return new CodeError(errMsg, err);
    } else {
      return new CustomError(errMsg || 'Unknown error', err, 'General');
    }
  }

  errorResponse(): ErrorRes {
    const logDetails: any = {
      name: this.name,
      message: this.message,
      stack: this.stack,
      errorType: this.errorType,
      originalError: this.getOriginalError(),
    };

    switch (this.errorType) {
      case 'API':
        logDetails.statusCode = this.statusCode;
        logDetails.responseData = this.responseData;
        break;
      case 'Network':
        logDetails.networkError = this.networkError;
        break;
      default:
        break;
    }
    return logDetails;
  }

  static processError(err: any) {
    const errorInstance = this.identifyAndCreateErrorInstance(err);
    return errorInstance.errorResponse();
  }
}

// API-related error
class ApiError extends CustomError {
  constructor(message: string, originalError?: any, statusCode?: number, responseData?: any) {
    super(message, originalError, 'API', statusCode, responseData);
  }
}

// Code-related issues
class CodeError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'Code');
  }
}

//Network-related issues
class NetworkError extends CustomError {
  constructor(message: string, originalError?: any) {
    super(message, originalError, 'Network', undefined, undefined, true);
  }
}
