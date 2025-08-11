export interface TOTPConfig {
  secret: string;
}

export interface TOTPValidationResult {
  isValid: boolean;
  error?: string;
}

export class TOTPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TOTPError';
  }
}

export interface ITOTPService {
  validateSecret(secret: string): boolean;
  encryptSecret(secret: string): string;
  decryptSecret(encryptedSecret: string): string;
  getStoredConfig(): TOTPConfig | null;
  storeConfig(config: TOTPConfig): void;
  removeConfig(): void;
  generateTOTP(secret: string): string;
  verifyTOTP(secret: string, token: string): boolean;
}