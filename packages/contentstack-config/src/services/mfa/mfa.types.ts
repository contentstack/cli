export interface MFAConfig {
  secret: string;
  last_updated: string;
}

export interface MFAValidationResult {
  isValid: boolean;
  error?: string;
}