import { cliux, NodeCrypto, log, messageHandler } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import { askOTP } from './interactive';

/**
 * @class
 * MFA handler for managing multi-factor authentication
 */
class MFAHandler {
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
   * Generates an MFA code from a provided secret
   * @param secret The MFA secret to use
   * @returns string The generated MFA code
   * @throws Error if the secret is invalid or code generation fails
   */
  generateMFACode(secret: string): string {
    log.debug('Generating MFA code from provided secret', { module: 'mfa-handler' });

    try {
      // Validate and normalize secret
      const normalizedSecret = secret.toUpperCase();
      if (!this.isValidBase32(normalizedSecret)) {
        log.debug('Invalid MFA secret format', { module: 'mfa-handler' });
        cliux.print('CLI_AUTH_MFA_INVALID_SECRET', { color: 'yellow' });
        cliux.print(
          'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
          { color: 'yellow' },
        );
        process.exit(1);
      }

      // Generate MFA code
      const code = authenticator.generate(normalizedSecret);
      log.debug('Generated MFA code successfully', { module: 'mfa-handler' });
      return code;
    } catch (error) {
      log.debug('Failed to generate MFA code', { module: 'mfa-handler', error });
      cliux.print('CLI_AUTH_MFA_GENERATION_FAILED', { color: 'yellow' });
      throw error;
    }
  }

  /**
   * Gets MFA code from stored configuration
   * @returns Promise<string> The MFA code
   * @throws Error if MFA code generation fails
   */
  async getMFACode(): Promise<string> {
    log.debug('Getting MFA code', { module: 'mfa-handler' });
    let secret: string | undefined;
    let source: string;

    const envSecret = process.env.CONTENTSTACK_MFA_SECRET;
    if (envSecret) {
      log.debug('Found MFA secret in environment variable', { module: 'mfa-handler' });
      if (!this.isValidBase32(envSecret.toUpperCase())) {
        log.debug('Invalid MFA secret format from environment variable', { module: 'mfa-handler' });
        cliux.print('CLI_AUTH_MFA_INVALID_SECRET', { color: 'yellow' });
        cliux.print(
          'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
          { color: 'yellow' },
        );
      } else {
        secret = envSecret;
        source = 'environment variable';
      }
    }

    if (secret) {
      try {
        const code = this.generateMFACode(secret);
        log.debug('Generated MFA code', { module: 'mfa-handler', source });
        return code;
      } catch (error) {
        log.debug('Failed to generate MFA code', { module: 'mfa-handler', error, source });
        cliux.print('CLI_AUTH_MFA_GENERATION_FAILED', { color: 'yellow' });
        cliux.print('CLI_AUTH_MFA_RECONFIGURE_HINT');
        cliux.print(
          'For more information about MFA, visit: https://www.contentstack.com/docs/developers/security/multi-factor-authentication',
          { color: 'yellow' },
        );
      }
    }
  }

  /**
   * Gets MFA code through manual user input
   * @returns Promise<string> The MFA code
   * @throws Error if code format is invalid
   */
  async getManualMFACode(): Promise<string> {
    try {
      const code = await askOTP();
      if (!/^\d{6}$/.test(code)) {
        throw new Error(messageHandler.parse('CLI_AUTH_MFA_INVALID_CODE'));
      }
      return code;
    } catch (error) {
      log.debug('Failed to get MFA code', { module: 'mfa-handler', error });
      throw error;
    }
  }

  /**
   * Validates an MFA code format
   * @param code The MFA code to validate
   * @returns boolean True if valid, false otherwise
   */
  isValidMFACode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }
}

export default new MFAHandler();
