import { MFAConfig } from './mfa.types';

export interface IMFAService {
  validateSecret(secret: string): boolean;
  encryptSecret(secret: string): string;
  decryptSecret(encryptedSecret: string): string;
  getStoredConfig(): MFAConfig | null;
  storeConfig(config: Partial<MFAConfig>): void;
  removeConfig(): void;
  generateMFA(secret: string): string;
  verifyMFA(secret: string, token: string): boolean;
}