import cliux from './cli-ux';
import HttpClient from './http-client';
import configHandler from './config-handler';
import * as ContentstackManagementSDK from '@contentstack/management';
import messageHandler from './message-handler';
const http = require('http');
const url = require('url');
import open from 'open';
import {LoggerService} from './logger';
const crypto = require('crypto');

/**
 * @class
 * Auth handler
 */
class AuthHandler {
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
  private logger:any;
  set host(contentStackHost) {
    this._host = contentStackHost;
  }

  constructor() {
    this.codeVerifier = crypto.randomBytes(32).toString('hex');
    this.OAuthAppId = process.env.OAUTH_APP_ID || '6400aa06db64de001a31c8a9';
    this.OAuthClientId = process.env.OAUTH_CLIENT_ID || 'Ie0FEfTzlfAHL4xM';
    this.OAuthRedirectURL = process.env.OAUTH_APP_REDIRECT_URL || 'http://localhost:8184';
    this.OAuthScope = '';
    this.OAuthResponseType = 'code';
    this.authTokenKeyName = 'authtoken';
    this.authEmailKeyName = 'email';
    this.oauthAccessTokenKeyName = 'oauthAccessToken';
    this.oauthDateTimeKeyName = 'oauthDateTime';
    this.oauthUserUidKeyName = 'userUid';
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
  initLog() {
    this.logger = new LoggerService(process.cwd(), 'cli-log');
  }
  async setOAuthBaseURL() {
    if (configHandler.get('region')['uiHost']) {
      this.OAuthBaseURL = configHandler.get('region')['uiHost'] || '';
    } else {
      throw new Error(
        'Invalid ui-host URL while authenticating. Please set your region correctly using the command - csdx config:set:region',
      );
    }
  }

  /*
   *
   * Login into Contentstack
   * @returns {Promise} Promise object returns {} on success
   */
  async oauth(): Promise<object> {
    return new Promise((resolve, reject) => {
      this.initLog();
      this.createHTTPServer()
        .then(() => {
          this.openOAuthURL()
            .then(() => {
              //set timeout for authorization
              resolve({});
            })
            .catch((error) => {
              this.logger.error('OAuth login failed', error.message);
              reject(error);
            });
        })
        .catch((error) => {
          this.logger.error('OAuth login failed', error.message);
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
            cliux.print('Auth code successfully fetched.');
            this.getAccessToken(queryObject.code)
              .then(async () => {
                await this.setOAuthBaseURL();
                cliux.print('Access token fetched using auth code successfully.');
                cliux.print(
                  `You can review the access permissions on the page - ${this.OAuthBaseURL}/#!/marketplace/authorized-apps`,
                );
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<style>
                body {
                  font-family: Arial, sans-serif;
                  text-align: center;
                  margin-top: 100px;
                }
              
                p {
                  color: #475161;
                  margin-bottom: 20px;
                }
                p button {
                  background-color: #6c5ce7;
                  color: #fff;
                  border: 1px solid transparent;
                  border-radius: 4px;
                  font-weight: 600;
                  line-height: 100%;
                  text-align: center;
                  min-height: 2rem;
                  padding: 0.3125rem 1rem;
                }
              </style>
              <h1 style="color: #6c5ce7">Successfully authorized!</h1>
              <p style="color: #475161; font-size: 16px; font-weight: 600">You can close this window now.</p>
              <p>
                You can review the access permissions on the
                <a
                  style="color: #6c5ce7; text-decoration: none"
                  href="${this.OAuthBaseURL}/#!/marketplace/authorized-apps"
                  target="_blank"
                  >Authorized Apps page</a
                >.
              </p>`);

                stopServer();
              })
              .catch((error) => {
                cliux.error(
                  'Error occoured while login with OAuth, please login with command - csdx auth:login --oauth',
                );
                cliux.error(error);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(
                  `<h1>Sorry!</h1><h2>Something went wrong, please login with command - csdx auth:login --oauth(</h2>`,
                );
                stopServer();
              });
          } else {
            cliux.error('Error occoured while login with OAuth, please login with command - csdx auth:login --oauth');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(
              `<h1>Sorry!</h1><h2>Something went wrong, please login with command - csdx auth:login --oauth(</h2>`,
            );
            stopServer();
          }
        });

        const stopServer = () => {
          server.close();
          process.exit();
        };

        server.listen(8184, () => {
          cliux.print('Waiting for the authorization server to respond...');
          resolve({ true: true });
        });
      } catch (error) {
        cliux.error(error);
        reject(error);
      }
    });
  }

  async openOAuthURL(): Promise<object> {
    return new Promise(async (resolve, reject) => {
      try {
        const digest = crypto.createHash('sha256').update(this.codeVerifier).digest();
        const codeChallenge = digest.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        await this.setOAuthBaseURL();
        let url = `${this.OAuthBaseURL}/#!/apps/${this.OAuthAppId}/authorize?response_type=${this.OAuthResponseType}&client_id=${this.OAuthClientId}&redirect_uri=${this.OAuthRedirectURL}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

        if (this.OAuthScope) {
          url += `&scope=${encodeURIComponent(this.OAuthScope)}`;
        }
        cliux.print(
          'This will automatically start the browser and open the below URL, if it does not, you can copy and paste the below URL in the browser without terminating this command.',
          { color: 'yellow' },
        );
        cliux.print(url, { color: 'green' });
        resolve(open(url));
      } catch (error) {
        reject(error);
      }
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
      this.setOAuthBaseURL();
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
          cliux.error('An error occoured while fetching the access token, run the command - csdx auth:login --oauth');
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
        this.setOAuthBaseURL();
        const httpClient = new HttpClient().headers(headers).asFormParams();
        httpClient
          .post(`${this.OAuthBaseURL}/apps-api/apps/token`, payload)
          .then(({ data }) => {
            if (data.error || (data.statusCode != 200 && data.message)) {
              let errorMessage = '';
              if (data.message) {
                if (data.message[0]) {
                  errorMessage = data.message[0];
                } else {
                  errorMessage = data.message;
                }
              } else {
                errorMessage = data.error;
              }
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
            cliux.error('An error occoured while refreshing the token');
            cliux.error(error);
            reject(error);
          });
      } else {
        cliux.error('Invalid/Empty refresh token, run the command- csdx auth:login --oauth');
        reject('Invalid/Empty refresh token');
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
        cliux.error('Invalid/Empty access token, run the command - csdx auth:login --oauth');
        reject('Invalid/Empty access token');
      }
    });
  }

  async oauthLogout(): Promise<object> {
    const authorization: string = await this.getOauthAppAuthorization() || "";
    const response: {} = await this.revokeOauthAppAuthorization(authorization)
    return response || {}
  }

  /**
   * Fetches all authorizations for the Oauth App, returns authorizationUid for current user.
   * @returns authorizationUid for the current user
   */
  async getOauthAppAuthorization(): Promise<string | undefined> {
    const headers = {
      authorization: `Bearer ${configHandler.get(this.oauthAccessTokenKeyName)}`,
      organization_uid: configHandler.get(this.oauthOrgUidKeyName),
      'Content-type': 'application/json'
    }
    const httpClient = new HttpClient().headers(headers)
    await this.setOAuthBaseURL();
    return httpClient
      .get(`${this.OAuthBaseURL}/apps-api/manifests/${this.OAuthAppId}/authorizations`)
      .then(({data}) => {
        if (data?.data?.length > 0) {
          const userUid = configHandler.get(this.oauthUserUidKeyName)
          const currentUserAuthorization = data?.data?.filter(element => element.user.uid === userUid) || [];
          if (currentUserAuthorization.length === 0) {
            throw new Error(messageHandler.parse("CLI_AUTH_LOGOUT_NO_AUTHORIZATIONS_USER"))
          }
          return currentUserAuthorization[0].authorization_uid  // filter authorizations by current logged in user
        } else {
          throw new Error(messageHandler.parse("CLI_AUTH_LOGOUT_NO_AUTHORIZATIONS"))
        }
      })
  }

  async revokeOauthAppAuthorization(authorizationId): Promise<object> {
    if (authorizationId.length > 1) {
      const headers = {
        authorization: `Bearer ${configHandler.get(this.oauthAccessTokenKeyName)}`,
        organization_uid: configHandler.get(this.oauthOrgUidKeyName),
        'Content-type': 'application/json'
      }
      const httpClient = new HttpClient().headers(headers)
      await this.setOAuthBaseURL();
      return httpClient
        .delete(`${this.OAuthBaseURL}/apps-api/manifests/${this.OAuthAppId}/authorizations/${authorizationId}`)
        .then(({data}) => {
          return data
        })
    }
  }

  isAuthenticated(): boolean {
    const authorizationType = configHandler.get(this.authorisationTypeKeyName);
    return (
      authorizationType === this.authorisationTypeOAUTHValue || authorizationType === this.authorisationTypeAUTHValue
    );
  }

  async getAuthorisationType(): Promise<any> {
    return configHandler.get(this.authorisationTypeKeyName) ? configHandler.get(this.authorisationTypeKeyName) : false;
  }

  async isAuthorisationTypeBasic(): Promise<boolean> {
    return configHandler.get(this.authorisationTypeKeyName) === this.authorisationTypeAUTHValue ? true : false;
  }

  async isAuthorisationTypeOAuth(): Promise<boolean> {
    return configHandler.get(this.authorisationTypeKeyName) === this.authorisationTypeOAUTHValue ? true : false;
  }

  checkExpiryAndRefresh = (force: boolean = false) => this.compareOAuthExpiry(force);

  async compareOAuthExpiry(force: boolean = false) {
    const oauthDateTime = configHandler.get(this.oauthDateTimeKeyName);
    const authorisationType = configHandler.get(this.authorisationTypeKeyName);
    if (oauthDateTime && authorisationType === this.authorisationTypeOAUTHValue) {
      const now = new Date();
      const oauthDate = new Date(oauthDateTime);
      const oauthValidUpto = new Date();
      oauthValidUpto.setTime(oauthDate.getTime() + 59 * 60 * 1000);
      if (force) {
        cliux.print('Force refreshing the token');
        return this.refreshToken();
      } else {
        if (oauthValidUpto > now) {
          return Promise.resolve();
        } else {
          cliux.print('Token expired, refreshing the token');
          return this.refreshToken();
        }
      }
    } else {
      cliux.print('No OAuth set');
      return this.unsetConfigData();
    }
  }
}

export default new AuthHandler();
