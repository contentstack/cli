export interface MFAConfig {
  secret: string;
  last_updated: string;
}

export interface MFAValidationResult {
  isValid: boolean;
  error?: string;
}

export interface IMFAService {
  validateSecret(secret: string): boolean;
  encryptSecret(secret: string): string;
  decryptSecret(encryptedSecret: string): string;
  getStoredConfig(): MFAConfig | null;
  storeConfig(config: MFAConfig): void;
  removeConfig(): void;
  generateMFA(secret: string): string;
  verifyMFA(secret: string, token: string): boolean;
}