import { cliux, configHandler, NodeCrypto, log } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import { askOTP } from './interactive';

/**
 * @class
 * TOTP handler for managing TOTP-based two-factor authentication
 */
class TOTPHandler {
  private readonly encrypter: NodeCrypto;

  constructor() {
    this.encrypter = new NodeCrypto();
  }

  /**
   * Validates if a string is a valid base32 secret
   * @param secret The secret to validate
   * @returns true if valid, false otherwise
   */
  private isValidBase32(secret: string): boolean {
    // Base32 string must:
    // 1. Contain only uppercase letters A-Z and digits 2-7
    // 2. Be at least 16 characters long (before padding)
    // 3. Have valid padding (no single = character)
    const base32Regex = /^[A-Z2-7]+(?:={2,6})?$/;
    const nonPaddedLength = secret.replace(/=+$/, '').length;
    return base32Regex.test(secret) && nonPaddedLength >= 16;
  }

  /**
   * Generates a TOTP code from a provided secret
   * @param secret The TOTP secret to use
   * @returns string The generated TOTP code
   * @throws Error if the secret is invalid or code generation fails
   */
  generateTOTPFromSecret(secret: string): string {
    log.debug('Generating TOTP code from provided secret', { module: 'totp-handler' });
    
    try {
      // Validate and normalize secret
      const normalizedSecret = secret.toUpperCase();
      if (!this.isValidBase32(normalizedSecret)) {
        throw new Error('Invalid TOTP secret format');
      }

      // Generate TOTP code
      const code = authenticator.generate(normalizedSecret);
      log.debug('Generated TOTP code successfully', { module: 'totp-handler' });
      return code;
    } catch (error) {
      log.debug('Failed to generate TOTP code', { module: 'totp-handler', error });
      throw new Error('Failed to generate TOTP code from provided secret');
    }
  }

  /**
   * Gets TOTP code from stored configuration
   * @returns Promise<string> The TOTP code
   * @throws Error if TOTP code generation fails
   */
  async getTOTPCode(): Promise<string> {
    log.debug('Getting TOTP code', { module: 'totp-handler' });
    let secret: string | undefined;
    let source: string;

    // Check config for stored secret
    log.debug('Checking stored TOTP secret', { module: 'totp-handler' });
    const totpConfig = configHandler.get('totp');
    if (totpConfig?.secret) {
      try {
        secret = this.encrypter.decrypt(totpConfig.secret);
        source = 'stored configuration';
      } catch (error) {
        log.debug('Failed to decrypt stored TOTP secret', { module: 'totp-handler', error });
        throw new Error('Failed to decrypt stored TOTP secret');
      }
    }

    if (secret) {
      try {
        const code = this.generateTOTPFromSecret(secret);
        log.debug('Generated TOTP code', { module: 'totp-handler', source });
        return code;
      } catch (error) {
        log.debug('Failed to generate TOTP code', { module: 'totp-handler', error, source });
        const message = `Failed to use TOTP secret from ${source}. Please enter the code manually.`;
        cliux.print('Consider reconfiguring TOTP using config:totp:add');
        throw new Error(message);
      }
    }

    // No secret available, ask for manual input
    log.debug('No TOTP secret found, requesting manual input', { module: 'totp-handler' });
    return this.getManualTOTPCode();
  }

  /**
   * Gets TOTP code through manual user input
   * @returns Promise<string> The TOTP code
   * @throws Error if code format is invalid
   */
  async getManualTOTPCode(): Promise<string> {
    const code = await askOTP();
    if (!/^\d{6}$/.test(code)) {
      throw new Error('Invalid TOTP code format. Code must be 6 digits.');
    }
    return code;
  }

  /**
   * Validates a TOTP code format
   * @param code The TOTP code to validate
   * @returns boolean True if valid, false otherwise
   */
  isValidTOTPCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Handles TOTP authentication flow
   * @returns Promise<string> The valid TOTP code
   */
  async handleTOTPAuth(): Promise<string> {
    try {
      return await this.getTOTPCode();
    } catch (error) {
      log.debug('TOTP code generation failed, falling back to manual input', { module: 'totp-handler', error });
      cliux.print(error instanceof Error ? error.message : 'Failed to generate TOTP code');
      return this.getManualTOTPCode();
    }
  }
}

export default new TOTPHandler();