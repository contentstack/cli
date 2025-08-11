import { configHandler, NodeCrypto, log } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import { TOTPConfig, TOTPError } from './totp.types';
import { ITOTPService } from './totp-service.interface';

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

    if (secret.trim() !== secret) {
      return false;
    }

    const base32Regex = /^[A-Z2-7]+=*$/;
    const normalizedSecret = secret.trim().toUpperCase();

    // Check minimum length (16 characters) and valid Base32 format
    if (normalizedSecret.length < 16 || !base32Regex.test(normalizedSecret)) {
      return false;
    }

    const paddingRegex = /=+$/;
    const paddingMatch = paddingRegex.exec(normalizedSecret);
    if (paddingMatch) {
      const paddingLength = paddingMatch[0].length;
      const unpadded = normalizedSecret.slice(0, -paddingLength);
      if (paddingLength > 6 || unpadded.length % 8 !== 0) {
        return false;
      }
    } else if (normalizedSecret.length % 8 !== 0) {
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
      throw new TOTPError('Failed to encrypt secret');
    }
  }

  decryptSecret(encryptedSecret: string): string {
    try {
      return this.encrypter.decrypt(encryptedSecret);
    } catch (error) {
      this.logger.error('Secret decryption failed', { error });
      throw new TOTPError('Failed to decrypt secret');
    }
  }

  getStoredConfig(): TOTPConfig | null {
    try {
      const config = configHandler.get('totp');
      return config?.secret ? config as TOTPConfig : null;
    } catch (error) {
      this.logger.error('Failed to read config', { error });
      throw new TOTPError('Failed to read configuration');
    }
  }

  storeConfig(config: Partial<TOTPConfig>): void {
    try {
      const updatedConfig: TOTPConfig = {
        ...config,
        last_updated: new Date().toISOString(),
        secret: config.secret!
      };
      configHandler.set('totp', updatedConfig);
    } catch (error) {
      this.logger.error('Failed to store config', { error });
      throw new TOTPError('Failed to store configuration');
    }
  }

  removeConfig(): void {
    try {
      configHandler.delete('totp');
    } catch (error) {
      this.logger.error('Failed to remove config', { error });
      throw new TOTPError('Failed to remove configuration');
    }
  }

  generateTOTP(secret: string): string {
    try {
      return authenticator.generate(secret.trim().toUpperCase());
    } catch (error) {
      this.logger.error('Failed to generate code', { error });
      throw new TOTPError('Failed to generate code');
    }
  }

  verifyTOTP(secret: string, token: string): boolean {
    try {
      return authenticator.check(token, secret.trim().toUpperCase());
    } catch (error) {
      this.logger.debug('Secret verification failed', { error });
      return false;
    }
  }
}