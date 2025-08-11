import { configHandler, NodeCrypto, log } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import { ITOTPService, TOTPConfig, TOTPError } from './types';

export class TOTPService implements ITOTPService {
  private readonly encrypter: NodeCrypto;
  private readonly logger = log;

  constructor() {
    this.encrypter = new NodeCrypto();
  }

  validateSecret(secret: string): boolean {
    if (!secret || typeof secret !== 'string') {
      return false;
    }

    // Check for leading/trailing spaces in original input
    if (secret.trim() !== secret) {
      return false;
    }

    // Base32 validation (A-Z, 2-7)
    const base32Regex = /^[A-Z2-7]+=*$/;
    const normalizedSecret = secret.trim().toUpperCase();

    // Check minimum length (16 characters) and valid Base32 format
    if (normalizedSecret.length < 16 || !base32Regex.test(normalizedSecret)) {
      return false;
    }

    // Check for invalid padding
    const paddingRegex = /=+$/;
    const paddingMatch = paddingRegex.exec(normalizedSecret);
    if (paddingMatch) {
      const paddingLength = paddingMatch[0].length;
      const unpadded = normalizedSecret.slice(0, -paddingLength);
      if (paddingLength > 6 || unpadded.length % 8 !== 0) {
        return false;
      }
    } else if (normalizedSecret.length % 8 !== 0) {
      // If no padding, length must be a multiple of 8
      return false;
    }

    try {
      const token = authenticator.generate(normalizedSecret);
      return authenticator.check(token, normalizedSecret);
    } catch (error) {
      this.logger.debug('Secret validation failed', { error });
      return false;
    }
  }

  encryptSecret(secret: string): string {
    try {
      return this.encrypter.encrypt(secret.trim().toUpperCase());
    } catch (error) {
      this.logger.error('Secret encryption failed', { error });
      throw new TOTPError('Failed to encrypt TOTP secret');
    }
  }

  decryptSecret(encryptedSecret: string): string {
    try {
      return this.encrypter.decrypt(encryptedSecret);
    } catch (error) {
      this.logger.error('Secret decryption failed', { error });
      throw new TOTPError('Failed to decrypt TOTP secret');
    }
  }

  getStoredConfig(): TOTPConfig | null {
    try {
      const config = configHandler.get('totp');
      return config?.secret ? config as TOTPConfig : null;
    } catch (error) {
      this.logger.error('Failed to read TOTP config', { error });
      throw new TOTPError('Failed to read TOTP configuration');
    }
  }

  storeConfig(config: TOTPConfig): void {
    try {
      configHandler.set('totp', config);
    } catch (error) {
      this.logger.error('Failed to store TOTP config', { error });
      throw new TOTPError('Failed to store TOTP configuration');
    }
  }

  removeConfig(): void {
    try {
      configHandler.delete('totp');
    } catch (error) {
      this.logger.error('Failed to remove TOTP config', { error });
      throw new TOTPError('Failed to remove TOTP configuration');
    }
  }

  generateTOTP(secret: string): string {
    try {
      return authenticator.generate(secret.trim().toUpperCase());
    } catch (error) {
      this.logger.error('Failed to generate TOTP code', { error });
      throw new TOTPError('Failed to generate TOTP code');
    }
  }

  verifyTOTP(secret: string, token: string): boolean {
    try {
      return authenticator.check(token, secret.trim().toUpperCase());
    } catch (error) {
      this.logger.debug('TOTP verification failed', { error });
      return false;
    }
  }
}