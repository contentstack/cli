import { cliux, log, handleAndLogError, messageHandler } from '@contentstack/cli-utilities';
import { User } from '../interfaces';
import { askOTPChannel, askOTP } from './interactive';

/**
 * @class
 * Auth handler
 */
class AuthHandler {
  private _client;
  private _host;
  set client(contentStackClient) {
    log.debug('Setting ContentStack client', { module: 'auth-handler' });
    this._client = contentStackClient;
  }
  set host(contentStackHost) {
    log.debug(`Setting ContentStack host: ${contentStackHost}`, { module: 'auth-handler' });
    this._host = contentStackHost;
  }

  /**
   *
   *
   * Login into Contentstack
   * @param {string} email Contentstack email address
   * @param {string} password User's password for contentstack account
   * @returns {Promise} Promise object returns authtoken on success
   * TBD: take out the otp implementation from login and create a new method/function to handle otp
   */
  /**
   * Handle the OTP flow for 2FA authentication
   * @param tfaToken Optional pre-provided TFA token
   * @param loginPayload Login payload containing user credentials
   * @returns Promise<string> The TFA token to use for authentication
   */
  private async handleOTPFlow(tfaToken?: string, loginPayload?: any): Promise<string> {
    try {
      if (tfaToken) {
        log.info('Using provided TFA token', { module: 'auth-handler' });
        return tfaToken;
      }

      log.debug('2FA required, requesting OTP channel', { module: 'auth-handler' });
      const otpChannel = await askOTPChannel();
      log.debug(`OTP channel selected: ${otpChannel}`, { module: 'auth-handler' });

      if (otpChannel === 'sms') {
        try {
          await this.requestSMSOTP(loginPayload);
        } catch (error) {
          log.debug('SMS OTP request failed', { module: 'auth-handler', error });
          cliux.print('CLI_AUTH_SMS_OTP_FAILED', { color: 'red' });
          throw error;
        }
      }

      log.debug('Requesting OTP input', { module: 'auth-handler', channel: otpChannel });
      return await askOTP();
    } catch (error) {
      log.debug('2FA flow failed', { module: 'auth-handler', error });
      throw error;
    }
  }

  /**
   * Request SMS OTP for 2FA authentication
   * @param loginPayload Login payload containing user credentials
   * @throws CLIError if SMS request fails
   */
  private async requestSMSOTP(loginPayload: any): Promise<void> {
    log.debug('Sending SMS OTP request', { module: 'auth-handler' });
    try {
      await this._client.axiosInstance.post('/user/request_token_sms', { user: loginPayload });
      log.debug('SMS OTP request successful', { module: 'auth-handler' });
      cliux.print('CLI_AUTH_LOGIN_SECURITY_CODE_SEND_SUCCESS');
    } catch (error) {
      log.debug('SMS OTP request failed', { module: 'auth-handler', error });
      throw error;
    }
  }

  async login(email: string, password: string, tfaToken?: string): Promise<User> {
    const hasCredentials = typeof password === 'string' && password.length > 0;
    const hasTfaToken = typeof tfaToken === 'string' && tfaToken.length > 0;
    log.debug('Starting login process', {
      module: 'auth-handler',
      email,
      hasCredentials,
      hasTfaToken,
    });

    return new Promise((resolve, reject) => {
      if (email && password) {
        const loginPayload: {
          email: string;
          password: string;
          tfa_token?: string;
        } = { email, password };
        if (tfaToken) {
          loginPayload.tfa_token = tfaToken;
          log.debug('Adding TFA token to login payload', { module: 'auth-handler' });
        }

        log.debug('Making login API call', {
          module: 'auth-handler',
          payload: { email, hasCredentials, hasTfaToken },
        });

        this._client
          .login(loginPayload)
          .then(async (result: any) => {
            log.debug('Login API response received', {
              module: 'auth-handler',
              hasUser: !!result.user,
              errorCode: result.error_code,
            });

            if (result.user) {
              log.debug('Login successful, user found', { module: 'auth-handler', userEmail: result.user.email });
              resolve(result.user as User);
            } else if (result.error_code === 294) {
              const tfToken = await this.handleOTPFlow(tfaToken, loginPayload);

              try {
                resolve(await this.login(email, password, tfToken));
              } catch (error) {
                log.debug('Login with TFA token failed', { module: 'auth-handler', error });
                handleAndLogError(error, { module: 'auth-handler' });
                cliux.print('CLI_AUTH_2FA_FAILED', { color: 'red' });
                reject(error);
              }
            } else {
              log.debug('Login failed - no user found', { module: 'auth-handler', result });
              reject(new Error(messageHandler.parse('CLI_AUTH_LOGIN_NO_USER')));
            }
          })
          .catch((error: any) => {
            log.debug('Login API call failed', { module: 'auth-handler', error: error?.errorMessage || error });
            cliux.print('CLI_AUTH_LOGIN_FAILED', { color: 'yellow' });
            handleAndLogError(error, { module: 'auth-handler' });
          });
      } else {
        const hasEmail = !!email;
        const hasCredentials = !!password;
        log.debug('Login failed - missing credentials', {
          module: 'auth-handler',
          hasEmail,
          hasCredentials,
        });
        log.debug('Login failed - missing credentials', { module: 'auth-handler', hasEmail, hasCredentials });
        reject(new Error(messageHandler.parse('CLI_AUTH_LOGIN_NO_CREDENTIALS')));
      }
    });
  }

  /**
   * Logout from Contentstack
   * @param {string} authtoken authtoken that needs to invalidated when logging out
   * @returns {Promise} Promise object returns response object from Contentstack
   */
  async logout(authtoken: string): Promise<object> {
    log.debug('Starting logout process', { module: 'auth-handler', hasAuthToken: !!authtoken });

    return new Promise((resolve, reject) => {
      if (authtoken) {
        log.debug('Making logout API call', { module: 'auth-handler' });

        this._client
          .logout(authtoken)
          .then(function (response: object) {
            log.debug('Logout API call successful', { module: 'auth-handler', response });
            return resolve(response);
          })
          .catch((error: Error) => {
            log.debug('Logout API call failed', { module: 'auth-handler', error: error.message });
            cliux.print('CLI_AUTH_LOGOUT_FAILED', { color: 'yellow' });
            handleAndLogError(error, { module: 'auth-handler' });
            reject(error);
          });
      } else {
        log.debug('Logout failed - no auth token provided', { module: 'auth-handler' });
        cliux.print('CLI_AUTH_LOGOUT_NO_TOKEN', { color: 'yellow' });
        reject(new Error(messageHandler.parse('CLI_AUTH_LOGOUT_NO_TOKEN')));
      }
    });
  }

  /**
   * Validate token
   * @param {string} authtoken
   * @returns {Promise} Promise object returns response object from Contentstack
   */
  async validateAuthtoken(authtoken: string): Promise<object> {
    log.debug('Starting token validation', { module: 'auth-handler', hasAuthToken: !!authtoken });

    return new Promise((resolve, reject) => {
      if (authtoken) {
        log.debug('Making token validation API call', { module: 'auth-handler' });

        this._client
          .getUser()
          .then((user: object) => {
            log.debug('Token validation successful', { module: 'auth-handler', user });
            resolve(user);
          })
          .catch((error: Error) => {
            log.debug('Token validation failed', { module: 'auth-handler', error: error.message });
            cliux.print('CLI_AUTH_TOKEN_VALIDATION_FAILED', { color: 'yellow' });
            handleAndLogError(error, { module: 'auth-handler' });
          });
      } else {
        log.debug('Token validation failed - no auth token provided', { module: 'auth-handler' });
        cliux.print('CLI_AUTH_TOKEN_VALIDATION_NO_TOKEN', { color: 'yellow' });
        reject(new Error(messageHandler.parse('CLI_AUTH_TOKEN_VALIDATION_NO_TOKEN')));
      }
    });
  }
}

export default new AuthHandler();
