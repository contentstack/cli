export default class CLIError extends Error {
  suggestions?: string[];

  constructor(message, suggestions?: string[]) {
    super(message);
    this.suggestions = suggestions;
    this.message = message;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}
