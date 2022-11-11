import { cliux, logger, CLIError, HttpClient, configHandler } from '@contentstack/cli-utilities';
import * as ContentstackManagementSDK from '@contentstack/management';
require('dotenv').config();

const http = require('http');
const url = require('url');
const open = require('open');
const crypto = require('crypto');

/**
 * @class
 * Auth handler
 */
class AuthHandler {
  private _client;
  private _host;

  private codeVerifier: string;
  private OAuthBaseURL: string;
  private OAuthAppId: string;
  private OAuthClientId: string;
  private OAuthRedirectURL: string;
  private OAuthScope: string;
  private OAuthResponseType: string;
  private authTokenKeyName: string;
  private authEmailKeyName: string;
  private oauthAccessTokenKeyName: string;
  private oauthDateTimeKeyName: string;
  private oauthUserUidKeyName: string;
  private oauthOrgUidKeyName: string;
  private oauthRefreshTokenKeyName: string;
  private authorisationTypeKeyName: string;
  private authorisationTypeOAUTHValue: string;
  private authorisationTypeAUTHValue: string;
  private allAuthConfigItems: any;

  set client(contentStackClient) {
    this._client = contentStackClient;
  }

  set host(contentStackHost) {
    this._host = contentStackHost;
  }

  constructor() {
    this.codeVerifier = crypto.pseudoRandomBytes(32).toString('hex');
    this.OAuthBaseURL = process.env.OAUTH_APP_BASE_URL || '';
    this.OAuthAppId = process.env.OAUTH_APP_ID || '';
    this.OAuthClientId = process.env.OAUTH_CLIENT_ID || '';
    this.OAuthRedirectURL = process.env.OAUTH_APP_REDIRECT_URL || '';
    this.OAuthScope =
      process.env.OAUTH_APP_SCOPE_WITH_ALL_PERMISSIONS ||
      process.env.OAUTH_APP_SCOPE_PERMISSIONS ||
      'user:read cm.stacks.management:read organization:read';
    this.OAuthResponseType = 'code';
    this.authTokenKeyName = 'authtoken';
    this.authEmailKeyName = 'email';
    this.oauthAccessTokenKeyName = 'oauthAccessToken';
    this.oauthDateTimeKeyName = 'oauthDateTime';
    this.oauthUserUidKeyName = 'oauthUserUid';
    this.oauthOrgUidKeyName = 'oauthOrgUid';
    this.oauthRefreshTokenKeyName = 'oauthRefreshToken';
    this.authorisationTypeKeyName = 'authorisationType';
    this.authorisationTypeOAUTHValue = 'OAUTH';
    this.authorisationTypeAUTHValue = 'BASIC';
    this.allAuthConfigItems = {
      refreshToken: [
        this.authTokenKeyName,
        this.oauthAccessTokenKeyName,
        this.oauthDateTimeKeyName,
        this.oauthRefreshTokenKeyName,
      ],
      default: [
        this.authTokenKeyName,
        this.authEmailKeyName,
        this.oauthAccessTokenKeyName,
        this.oauthDateTimeKeyName,
        this.oauthUserUidKeyName,
        this.oauthOrgUidKeyName,
        this.oauthRefreshTokenKeyName,
        this.authorisationTypeKeyName,
      ],
    };
  }

  /***************************************** OAuth *****************************************
   *
   *
   * Login into Contentstack
   * @returns {Promise} Promise object returns {} on success
   */
  async oauth(): Promise<object> {
    return new Promise((resolve, reject) => {
      this.createHTTPServer()
        .then(() => {
          this.openOAuthURL()
            .then(() => {
              //set timeout for authorization
              logger.info('successfully logged in');
              cliux.success('CLI_AUTH_LOGIN_SUCCESS');
              resolve({});
            })
            .catch((error) => {
              logger.error('SSO login failed', error.message);
              cliux.error('CLI_AUTH_LOGIN_FAILED', { color: 'red' });
              reject(error);
            });
        })
        .catch((error) => {
          logger.error('SSO login failed', error.message);
          cliux.error('CLI_AUTH_LOGIN_FAILED', { color: 'red' });
          reject(error);
        });
    });
  }

  async createHTTPServer(): Promise<object> {
    return new Promise((resolve, reject) => {
      try {
        const server = http.createServer((req, res) => {
          const reqURL = req.url;
          const queryObject = url.parse(reqURL, true).query;
          if (queryObject.code) {
            cliux.print('Success fetching auth code');
            this.getAccessToken(queryObject.code)
              .then(() => {
                cliux.success('Success fetching Access token using Auth Code');
                // this.refreshToken()
                //   .then(() => {
                // cliux.success('Success fetching Access token using Refresh Token');

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<h1>Thank You!</h1><h2>We know who you are, now you can close this window :)</h2>`);
                stopServer();

                //   })
                //   .catch((error) => {
                //     cliux.error(
                //       'Error occoured while login with SSO, please login with command - csdx auth:login --sso',
                //     );
                //     cliux.error(error);
                //     res.writeHead(200, { 'Content-Type': 'text/html' });
                //     res.end(
                //       `<h1>Sorry!</h1><h2>Something went wrong, please login with command - csdx auth:login --sso(</h2>`,
                //     );
                //     stopServer();
                //   });
              })
              .catch((error) => {
                cliux.error('Error occoured while login with SSO, please login with command - csdx auth:login --sso');
                cliux.error(error);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(
                  `<h1>Sorry!</h1><h2>Something went wrong, please login with command - csdx auth:login --sso(</h2>`,
                );
                stopServer();
              });
          } else {
            cliux.error('Error occoured while login with SSO, please login with command - csdx auth:login --sso');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<h1>Sorry!</h1><h2>Something went wrong, please login with command - csdx auth:login --sso(</h2>`);
            stopServer();
          }
        });

        const stopServer = () => {
          cliux.print('Exiting NodeJS server');
          server.close();
          process.exit();
        };

        server.listen(8080, () => {
          cliux.print('Waiting for the authorization server to respond');
          resolve({ true: true });
        });
      } catch (error) {
        cliux.error(error);
        reject(error);
      }
    });
  }

  async openOAuthURL(): Promise<object> {
    return new Promise((resolve) => {
      const digest = crypto.createHash('sha256').update(this.codeVerifier).digest();
      const codeChallenge = digest.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      let url = `${this.OAuthBaseURL}/#!/apps/${this.OAuthAppId}/authorize?response_type=${this.OAuthResponseType}&client_id=${this.OAuthClientId}&redirect_uri=${this.OAuthRedirectURL}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      if (this.OAuthScope) {
        url += `&scope=${encodeURIComponent(this.OAuthScope)}`;
      }
      cliux.print(
        'This will automatically start the browser and open below URL, if this does not, you can copy and paste the below URL in browser without terminating this command.',
        { color: 'yellow' },
      );
      cliux.print(url, { color: 'green' });
      resolve(open(url));
    });
  }

  async getAccessToken(code: string): Promise<object> {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      const payload = {
        grant_type: 'authorization_code',
        client_id: this.OAuthClientId,
        code_verifier: this.codeVerifier,
        redirect_uri: this.OAuthRedirectURL,
        code: code,
      };
      const httpClient = new HttpClient().headers(headers).asFormParams();
      httpClient
        .post(`${this.OAuthBaseURL}/apps-api/apps/token`, payload)
        .then(({ data }) => {
          return this.getUserDetails(data);
        })
        .then((data) => {
          if (data['access_token'] && data['refresh_token']) {
            return this.setConfigData('oauth', data);
          } else {
            reject('Invalid request');
          }
        })
        .then(resolve)
        .catch((error) => {
          cliux.error('Error occoured while fetching access token, run command - csdx auth:login --sso');
          cliux.error(error);
          reject(error);
        });
    });
  }

  async setConfigData(type: string, userData: any = {}): Promise<object> {
    return new Promise(async (resolve, reject) => {
      //Delete the old configstore auth data
      this.unsetConfigData(type)
        .then(() => {
          switch (type) {
            case 'oauth':
              if (userData.access_token && userData.refresh_token) {
                //Set the new OAuth tokens info
                configHandler.set(this.oauthAccessTokenKeyName, userData.access_token);
                configHandler.set(this.oauthRefreshTokenKeyName, userData.refresh_token);
                configHandler.set(this.authEmailKeyName, userData.email);
                configHandler.set(this.oauthDateTimeKeyName, new Date());
                configHandler.set(this.oauthUserUidKeyName, userData.user_uid);
                configHandler.set(this.oauthOrgUidKeyName, userData.organization_uid);
                configHandler.set(this.authorisationTypeKeyName, this.authorisationTypeOAUTHValue);

                resolve(userData);
              } else {
                reject('Invalid request');
              }
              break;

            case 'refreshToken':
              if (userData.access_token && userData.refresh_token) {
                //Set the new OAuth tokens info
                configHandler.set(this.oauthAccessTokenKeyName, userData.access_token);
                configHandler.set(this.oauthRefreshTokenKeyName, userData.refresh_token);
                configHandler.set(this.oauthDateTimeKeyName, new Date());
                resolve(userData);
              } else {
                reject('Invalid request');
              }
              break;

            case 'basicAuth':
              if (userData.authtoken && userData.email) {
                //Set the new auth tokens info
                configHandler.set(this.authTokenKeyName, userData.authtoken);
                configHandler.set(this.authEmailKeyName, userData.email);
                configHandler.set(this.authorisationTypeKeyName, this.authorisationTypeAUTHValue);
                resolve(userData);
              } else {
                reject('Invalid request');
              }
              break;

            case 'logout':
              resolve(userData);
              break;

            default:
              reject('Invalid request');
              break;
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  async unsetConfigData(type = 'default'): Promise<void> {
    return new Promise(async (resolve, reject) => {
      //Delete the old auth tokens info
      let removeItems: string[] = this.allAuthConfigItems.default;
      if (type === 'refreshToken') {
        removeItems = this.allAuthConfigItems.refreshToken;
      }
      removeItems.forEach((element) => {
        configHandler.delete(element);
      });
      resolve();
    });
  }

  async refreshToken(): Promise<object> {
    return new Promise((resolve, reject) => {
      const configOauthRefreshToken = configHandler.get(this.oauthRefreshTokenKeyName);
      const configAuthorisationType = configHandler.get(this.authorisationTypeKeyName);

      if (configAuthorisationType === this.authorisationTypeOAUTHValue && configOauthRefreshToken) {
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        const payload = {
          grant_type: 'refresh_token',
          client_id: this.OAuthClientId,
          redirect_uri: this.OAuthRedirectURL,
          refresh_token: configOauthRefreshToken,
        };
        const httpClient = new HttpClient().headers(headers).asFormParams();
        httpClient
          .post(`${this.OAuthBaseURL}/apps-api/apps/token`, payload)
          //   .then(({ data }) => {
          //     return this.getUserDetails(data);
          //   })
          .then(({ data }) => {
            if (data.error) {
              const errorMessage = data.message ? (data.message[0] ? data.message[0] : data.message) : data.error;
              reject(errorMessage);
            } else {
              if (data['access_token'] && data['refresh_token']) {
                return this.setConfigData('refreshToken', data);
              } else {
                reject('Invalid request');
              }
            }
          })
          .then(resolve)
          .catch((error) => {
            cliux.error('Error occoured while refreshing token');
            cliux.error(error);
            reject(error);
          });
      } else {
        cliux.error('Invalid/Empty Refresh token, run command - csdx auth:login --sso');
        reject('Invalid/Empty Refresh token');
      }
    });
  }

  async getUserDetails(data): Promise<object> {
    return new Promise((resolve, reject) => {
      const accessToken = data.access_token;
      if (accessToken) {
        const param = {
          host: this._host,
          authorization: `Bearer ${accessToken}`,
        };

        const managementAPIClient = ContentstackManagementSDK.client(param);
        managementAPIClient
          .getUser()
          .then((user) => {
            data.email = user?.email || '';
            resolve(data);
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        cliux.error('Invalid/Empty Access token, run command - csdx auth:login --sso');
        reject('Invalid/Empty Access token');
      }
    });
  }

  async isAuthenticated(): Promise<boolean> {
    const authorizationType = configHandler.get(this.authorisationTypeKeyName);
    return (
      authorizationType === this.authorisationTypeOAUTHValue || authorizationType === this.authorisationTypeAUTHValue
    );
  }

  checkExpiryAndRefresh = (force: boolean = false) => this.compareOAuthExpiry(force);

  async compareOAuthExpiry(force: boolean = false) {
    const oauthDateTime = configHandler.get(this.oauthDateTimeKeyName);
    const authorisationType = configHandler.get(this.authorisationTypeKeyName);
    if (oauthDateTime && authorisationType === this.authorisationTypeOAUTHValue) {
      const now = new Date();
      //   const now = new Date(configHandler.get('oauthDateTime2'));

      const oauthDate = new Date(oauthDateTime);
      const oauthValidUpto = new Date();
      oauthValidUpto.setTime(oauthDate.getTime() + 50 * 60 * 1000);
      if (force) {
        console.log('Force refreshing token');
        return this.refreshToken();
      } else {
        if (oauthValidUpto > now) {
          console.log('Valid/unexpired Token');
          return Promise.resolve();
        } else {
          console.log('Token is expired, refreshing token');
          return this.refreshToken();
        }
      }
    } else {
      console.log('no oauth set');
      return this.unsetConfigData();
    }
  }
}

export default new AuthHandler();
