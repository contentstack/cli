export default class ContentModelSeederError extends Error {
  suggestions: string[];

  constructor(message: string, suggestions: string[]) {
    super(message);

    this.suggestions = suggestions;
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}
