import { TOTPConfig } from './totp.types';

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