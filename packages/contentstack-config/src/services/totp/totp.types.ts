export interface TOTPConfig {
  secret: string;
  last_updated: string;
}

export interface TOTPValidationResult {
  isValid: boolean;
  error?: string;
}

export class TOTPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TOTPError';
    Object.setPrototypeOf(this, TOTPError.prototype);
  }
}