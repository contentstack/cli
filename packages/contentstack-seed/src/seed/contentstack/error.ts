export default class ContentstackError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.status = status;
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}
