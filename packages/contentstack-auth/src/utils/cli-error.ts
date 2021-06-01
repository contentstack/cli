export default class CLIError extends Error {
  suggestions?: string[];
  statusCode?: number;

  constructor(payload: { message: string; statusCode?: number }, suggestions?: string[]) {
    super(payload.message);

    this.suggestions = suggestions;
    this.name = this.constructor.name;
    this.statusCode = payload.statusCode;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(payload.message).stack;
    }
  }
}
