import { configHandler, log } from '@contentstack/cli-utilities'; // es-
import { authenticator } from 'otplib';
import { MFAConfig, IMFAService } from '../interfaces';

export class MFAService implements IMFAService {
  private readonly logger = log;

  validateSecret(secret: string): boolean {
    log.debug('Starting secret validation');

    // Check if secret is a non-empty string
    if (typeof secret !== 'string' || secret.trim() !== secret) {
      log.debug('Secret validation failed: not a string or contains leading/trailing whitespace');
      return false;
    }

    // Normalize secret and check base32 format and length
    const base32Regex = /^[A-Z2-7]+=*$/;
    const normalizedSecret = secret.trim().toUpperCase();
    log.debug('Checking secret format and length');

    if (normalizedSecret.length < 16 || !base32Regex.test(normalizedSecret)) {
      log.debug('Secret validation failed: invalid length or format');
      return false;
    }

    // Check padding
    const paddingRegex = /=*$/;
    const paddingMatch = paddingRegex.exec(normalizedSecret);
    let paddingLength = 0;
    if (paddingMatch) {
      paddingLength = paddingMatch[0].length;
      log.debug('Checking padding validity');
      if (paddingLength === 1 || paddingLength === 3 || paddingLength > 7) {
        log.debug('Secret validation failed: invalid padding length');
        return false;
      }
    }

    // Check unpadded length
    const unpaddedLength = normalizedSecret.replace(/=+$/, '').length;
    log.debug('Checking unpadded secret length');
    if (unpaddedLength % 8 !== 0) {
      log.debug('Secret validation failed: unpadded length not divisible by 8');
      return false;
    }

    try {
      log.debug('Attempting OTP generation and validation');
      const token = authenticator.generate(normalizedSecret);
      const isValid = authenticator.check(token, normalizedSecret);
      log.debug('OTP validation completed');
      return isValid;
    } catch (error) {
      log.debug('Secret validation failed during OTP generation', {
        error: error.message || error,
      });
      throw error;
    }
  }

  getStoredConfig(): MFAConfig | null {
    try {
      log.debug('Attempting to retrieve MFA configuration');

      const envSecret = process.env.CONTENTSTACK_MFA_SECRET;
      if (envSecret) {
        log.debug('Found MFA secret in environment variable');
        return {
          secret: envSecret,
          last_updated: new Date().toISOString(),
        };
      }

      log.debug('No MFA secret found in environment variable, checking stored config');
      const config = configHandler.get('mfa');
      log.debug('Retrieved stored MFA config');

      return config?.secret ? (config as MFAConfig) : null;
    } catch (error) {
      log.debug('Failed to read MFA config');
      throw error;
    }
  }

  storeConfig(config: Partial<MFAConfig>): void {
    log.debug('Attempting to store MFA configuration');

    if (!config.secret) {
      log.debug('No secret provided for MFA configuration');
      throw new Error('No secret provided for MFA configuration');
    }

    const updatedConfig: MFAConfig = {
      secret: config.secret,
      last_updated: new Date().toISOString(),
    };
    log.debug('Prepared updated MFA configuration');

    try {
      configHandler.set('mfa', updatedConfig);
      log.debug('Successfully stored MFA configuration');
    } catch (error) {
      log.error(`Failed to store MFA configuration: ${error.message || error}`);
      throw error;
    }
  }

  removeConfig(): void {
    try {
      log.debug('Attempting to remove MFA configuration');
      configHandler.delete('mfa');
      log.debug('Successfully removed MFA configuration');
    } catch (error) {
      log.error('Failed to remove MFA configuration');
      throw error;
    }
  }

  generateMFA(secret: string): string {
    try {
      log.debug('Attempting to generate MFA code');
      const normalizedSecret = secret.trim().toUpperCase();
      log.debug('Normalized secret for MFA code generation');
      const token = authenticator.generate(normalizedSecret);
      log.debug('Successfully generated MFA code');
      return token;
    } catch (error) {
      log.error('Failed to generate MFA code');
      throw error;
    }
  }
}
