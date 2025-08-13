import { configHandler, NodeCrypto, log, cliux } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import { MFAConfig } from './mfa.types';
import { IMFAService } from './mfa-service.interface';

export class MFAService implements IMFAService {
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

    // Check padding - must be 0, 2, 4, 5, 6, or 7 equals signs
    const paddingRegex = /=*$/;
    const paddingMatch = paddingRegex.exec(normalizedSecret);
    if (paddingMatch) {
      const paddingLength = paddingMatch[0].length;
      if (paddingLength === 1 || paddingLength === 3 || paddingLength > 7) {
        return false;
      }
    }

    // Check that the length without padding is a multiple of 8
    const unpaddedLength = normalizedSecret.replace(/=+$/, '').length;
    if (unpaddedLength % 8 !== 0) {
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
      throw new Error('Failed to encrypt secret');
    }
  }

  decryptSecret(encryptedSecret: string): string {
    try {
      return this.encrypter.decrypt(encryptedSecret);
    } catch (error) {
      this.logger.error('Secret decryption failed', { error });
      throw new Error('Failed to decrypt secret');
    }
  }

  getStoredConfig(): MFAConfig | null {
    try {
      // First check environment variable
      const envSecret = process.env.CONTENTSTACK_MFA_SECRET;
      if (envSecret) {
        this.logger.debug('Found MFA secret in environment variable');
        return {
          secret: envSecret,
          last_updated: new Date().toISOString()
        };
      }

      // Fallback to stored config
      const config = configHandler.get('mfa');
      return config?.secret ? config as MFAConfig : null;
    } catch (error) {
      this.logger.error('Failed to read config', { error });
      throw new Error('Failed to read configuration');
    }
  }

  storeConfig(config: Partial<MFAConfig>): void {
    try {
      const updatedConfig: MFAConfig = {
        secret: config.secret!,
        last_updated: new Date().toISOString()
      };
      configHandler.set('mfa', updatedConfig);
    } catch (error) {
      this.logger.error('Failed to store config', { error });
      throw new Error('Failed to store configuration');
    }
  }

  removeConfig(): void {
    try {
      configHandler.delete('mfa');
    } catch (error) {
      this.logger.error('Failed to remove config', { error });
      throw new Error('Failed to remove configuration');
    }
  }

  generateMFA(secret: string): string {
    try {
      return authenticator.generate(secret.trim().toUpperCase());
    } catch (error) {
      this.logger.error('Failed to generate code', { error });
      throw new Error('Failed to generate code');
    }
  }

  verifyMFA(secret: string, token: string): boolean {
    try {
      return authenticator.check(token, secret.trim().toUpperCase());
    } catch (error) {
      this.logger.debug('Secret verification failed', { error });
      return false;
    }
  }
}