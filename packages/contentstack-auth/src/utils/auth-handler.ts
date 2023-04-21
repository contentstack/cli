import { cliux, logger, CLIError } from '@contentstack/cli-utilities';
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
    this._client = contentStackClient;
  }
  set host(contentStackHost) {
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
    return new Promise((resolve, reject) => {
      if (email && password) {
        const loginPayload: {
          email: string;
          password: string;
          tfa_token?: string;
        } = { email, password };
        if (tfaToken) {
          loginPayload.tfa_token = tfaToken;
        }
        this._client
          .login(loginPayload)
          .then(async (result: any) => {
            logger.debug('login result', result);
            if (result.user) {
              resolve(result.user as User);
            } else if (result.error_code === 294) {
              const otpChannel = await askOTPChannel();
              // need to send sms to the mobile
              if (otpChannel === 'sms') {
                try {
                  await this._client.axiosInstance.post('/user/request_token_sms', { user: loginPayload });
                  cliux.print('CLI_AUTH_LOGIN_SECURITY_CODE_SEND_SUCCESS');
                } catch (error) {
                  logger.error('Failed to send the security code', error);
                  reject(new CLIError({ message: 'Failed to login - failed to send the security code' }));
                  return;
                }
              }
              const tfToken = await askOTP();
              try {
                resolve(await this.login(email, password, tfToken));
              } catch (error) {
                logger.error('Failed to login with tfa token', error);
                reject(new CLIError({ message: 'Failed to login with the tf token' }));
              }
            } else {
              reject(new CLIError({ message: 'No user found with the credentials' }));
            }
          })
          .catch((error: any) => {
            logger.error('Failed to login', error);
            reject(new CLIError({ message: error.errorMessage }));
          });
      } else {
        reject(new CLIError({ message: 'No credential found to login' }));
      }
    });
  }

  /**
   * Logout from Contentstack
   * @param {string} authtoken authtoken that needs to invalidated when logging out
   * @returns {Promise} Promise object returns response object from Contentstack
   */
  async logout(authtoken: string): Promise<object> {
    return new Promise((resolve, reject) => {
      if (authtoken) {
        this._client
          .logout(authtoken)
          .then(function (response: object) {
            return resolve(response);
          })
          .catch((error: Error) => {
            logger.error('Failed to logout', error);
            return reject(new CLIError({ message: 'Failed to logout - ' + error.message }));
          });
      } else {
        reject(new CLIError({ message: 'No auth token found to logout' }));
      }
    });
  }

  /**
   * Validate token
   * @param {string} authtoken
   * @returns {Promise} Promise object returns response object from Contentstack
   */
  async validateAuthtoken(authtoken: string): Promise<object> {
    return new Promise((resolve, reject) => {
      if (authtoken) {
        this._client
          .getUser()
          .then((user: object) => resolve(user))
          .catch((error: Error) => {
            logger.error('Failed to validate token', error);
            reject(new CLIError({ message: 'Failed to validate token - ' + error.message }));
          });
      } else {
        reject(new CLIError({ message: 'No auth token found to validate' }));
      }
    });
  }
}

export default new AuthHandler();
