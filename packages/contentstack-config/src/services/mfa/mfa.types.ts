export interface MFAConfig {
  secret: string;
  last_updated: string;
}

export interface MFAValidationResult {
  isValid: boolean;
  error?: string;
}

export class MFAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MFAError';
    Object.setPrototypeOf(this, MFAError.prototype);
  }
}