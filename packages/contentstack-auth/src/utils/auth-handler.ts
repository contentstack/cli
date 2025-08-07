import { cliux, CLIError, log, cliErrorHandler } from '@contentstack/cli-utilities';
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
  async login(email: string, password: string, tfaToken?: string): Promise<User> {
    const hasCredentials = !!password;
    const hasTfaToken = !!tfaToken;
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

        const hasCredentials = !!password;
        const hasTfaTokenPresent = !!tfaToken;
        log.debug('Making login API call', {
          module: 'auth-handler',
          payload: { email, hasCredentials, hasTfaTokenPresent },
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
              let tfToken: string;

              // If tfaToken is already provided, use it directly
              if (tfaToken) {
                log.debug('Using provided TFA token', { module: 'auth-handler' });
                tfToken = tfaToken;
              } else {
                // No token provided, ask for OTP channel
                log.debug('2FA required, requesting OTP channel', { module: 'auth-handler' });
                const otpChannel = await askOTPChannel();
                log.debug(`OTP channel selected: ${otpChannel}`, { module: 'auth-handler' });
                
                if (otpChannel === 'sms') {
                  // Send SMS OTP request
                  log.debug('Sending SMS OTP request', { module: 'auth-handler' });
                  try {
                    await this._client.axiosInstance.post('/user/request_token_sms', { user: loginPayload });
                    log.debug('SMS OTP request successful', { module: 'auth-handler' });
                    cliux.print('CLI_AUTH_LOGIN_SECURITY_CODE_SEND_SUCCESS');
                  } catch (error) {
                    log.debug('SMS OTP request failed', { module: 'auth-handler', error });
                    const err = cliErrorHandler.classifyError(error);
                    reject(new CLIError(err));
                    return;
                  }
                }
                
                // Ask for OTP input (either SMS code or TOTP code)
                log.debug('Requesting OTP input', { module: 'auth-handler', channel: otpChannel });
                tfToken = await askOTP();
              }

              try {
                resolve(await this.login(email, password, tfToken));
              } catch (error) {
                log.debug('Login with TFA token failed', { module: 'auth-handler', error });
                const err = cliErrorHandler.classifyError(error);
                reject(new CLIError(err));
                return;
              }
            } else {
              log.debug('Login failed - no user found', { module: 'auth-handler', result });
              reject(new CLIError({ message: 'No user found with the credentials' }));
            }
          })
          .catch((error: any) => {
            log.debug('Login API call failed', { module: 'auth-handler', error: error.message || error });
            const err = cliErrorHandler.classifyError(error);
            reject(err);
          });
      } else {
        const hasEmail = !!email;
        const hasCredentials = !!password;
        log.debug('Login failed - missing credentials', {
          module: 'auth-handler',
          hasEmail,
          hasCredentials,
        });
        reject(new CLIError('No credential found to login'));
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
            const err = cliErrorHandler.classifyError(error);
            reject(err);
          });
      } else {
        log.debug('Logout failed - no auth token provided', { module: 'auth-handler' });
        reject(new CLIError('No auth token found to logout'));
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
            const err = cliErrorHandler.classifyError(error);
            reject(err);
          });
      } else {
        log.debug('Token validation failed - no auth token provided', { module: 'auth-handler' });
        reject(new CLIError('No auth token found to validate'));
      }
    });
  }
}

export default new AuthHandler();
