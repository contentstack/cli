import cliux from './cli-ux';
import configHandler from './config-handler';
import dotenv from 'dotenv';
import open from 'open';
import http from 'http';
import url from 'url';
import { LoggerService } from './logger';
import managementSDKClient, { ContentstackClient } from './contentstack-management-sdk';
import { formatError } from './helpers';

dotenv.config();

/**
 * @class
 * Auth handler
 */
class AuthHandler {
  private _host;
  private OAuthBaseURL: string;
  private OAuthAppId: string;
  private OAuthClientId: string;
  private OAuthRedirectURL: string;
  private OAuthScope: string[];
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
  private logger: any;
  private oauthHandler: any;
  private managementAPIClient: ContentstackClient;
  private isRefreshingToken: boolean = false; // Flag to track if a refresh operation is in progress

  set host(contentStackHost) {
    this._host = contentStackHost;
  }

  constructor() {
    this.OAuthAppId = process.env.OAUTH_APP_ID || '6400aa06db64de001a31c8a9';
    this.OAuthClientId = process.env.OAUTH_CLIENT_ID || 'Ie0FEfTzlfAHL4xM';
    this.OAuthRedirectURL = process.env.OAUTH_APP_REDIRECT_URL || 'http://localhost:8184';
    this.OAuthScope = [];
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

  async initSDK() {
    this.managementAPIClient = await managementSDKClient({ host: this._host });
    this.oauthHandler = this.managementAPIClient.oauth({
      appId: this.OAuthAppId,
      clientId: this.OAuthClientId,
      redirectUri: this.OAuthRedirectURL,
      scope: this.OAuthScope,
      responseType: this.OAuthResponseType,
    });
    this.restoreOAuthConfig();
  }

  /*
   *
   * Login into Contentstack
   * @returns {Promise} Promise object returns {} on success
   */
  async oauth(): Promise<void> {
    try {
      this.initLog();
      await this.initSDK();
      await this.createHTTPServer();
      await this.openOAuthURL();
    } catch (error) {
      this.logger.error('OAuth login failed', error.message);
      throw error;
    }
  }

  async createHTTPServer(): Promise<void> {
    try {
      const server = http.createServer(async (req, res) => {
        const queryObject = url.parse(req.url, true).query;

        if (!queryObject.code) {
          cliux.error('Error occoured while login with OAuth, please login with command - csdx auth:login --oauth');
          return sendErrorResponse(res);
        }

        cliux.print('Auth code successfully fetched.');

        try {
          await this.getAccessToken(queryObject.code as string);
          await this.setOAuthBaseURL();

          cliux.print('Access token fetched using auth code successfully.');
          cliux.print(
            `You can review the access permissions on the page - ${this.OAuthBaseURL}/#!/marketplace/authorized-apps`,
          );

          sendSuccessResponse(res);
          stopServer();
        } catch (error) {
          cliux.error('Error occoured while login with OAuth, please login with command - csdx auth:login --oauth');
          cliux.error(error);
          sendErrorResponse(res);
          stopServer();
        }
      });

      const sendSuccessResponse = (res: any) => {
        const successHtml = `
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
            p { color: #475161; margin-bottom: 20px; }
            p button { background-color: #6c5ce7; color: #fff; border: 1px solid transparent; border-radius: 4px; font-weight: 600; line-height: 100%; text-align: center; min-height: 2rem; padding: 0.3125rem 1rem; }
          </style>
          <h1 style="color: #6c5ce7">Successfully authorized!</h1>
          <p style="color: #475161; font-size: 16px; font-weight: 600">You can close this window now.</p>
          <p>
            You can review the access permissions on the
            <a style="color: #6c5ce7; text-decoration: none" href="${this.OAuthBaseURL}/#!/marketplace/authorized-apps" target="_blank">Authorized Apps page</a>.
          </p>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(successHtml);
      };

      const sendErrorResponse = (res: any) => {
        const errorHtml = `
          <h1>Sorry!</h1><h2>Something went wrong, please login with command.</h2>`;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(errorHtml);
      };

      const stopServer = () => {
        server.close();
        process.exit();
      };

      server.listen(8184, () => {
        cliux.print('Waiting for the authorization server to respond...');
        return { true: true };
      });
      // Listen for errors
      server.on('error', (err) => {
        cliux.error('Server encountered an error:', formatError(err));
      });
    } catch (error) {
      cliux.error(error);
      throw error;
    }
  }

  async openOAuthURL(): Promise<void> {
    try {
      const url = await this.oauthHandler.authorize();
      cliux.print(
        'This will automatically start the browser and open the below URL, if it does not, you can copy and paste the below URL in the browser without terminating this command.',
        { color: 'yellow' },
      );
      cliux.print(url, { color: 'green' });
      await open(url);
    } catch (error) {
      throw error;
    }
  }

  async getAccessToken(code: string): Promise<void> {
    try {
      const data = await this.oauthHandler.exchangeCodeForToken(code);
      const userData = await this.getUserDetails(data);
      if (userData['access_token'] && userData['refresh_token']) {
        await this.setConfigData('oauth', userData);
      } else {
        throw new Error('Invalid request');
      }
    } catch (error) {
      cliux.error('An error occurred while fetching the access token, run the command - csdx auth:login --oauth');
      cliux.error(error);
      throw error;
    }
  }

  async setConfigData(type: string, userData: any = {}): Promise<object> {
    try {
      this.unsetConfigData(type);
      switch (type) {
        case 'oauth':
        case 'refreshToken':
          if (userData.access_token && userData.refresh_token) {
            this.setOAuthConfigData(userData, type);
            return userData;
          } else {
            throw new Error('Invalid request');
          }
        case 'basicAuth':
          if (userData.authtoken && userData.email) {
            this.setBasicAuthConfigData(userData);
            return userData;
          } else {
            throw new Error('Invalid request');
          }
        case 'logout':
          return userData;
        default:
          throw new Error('Invalid request');
      }
    } catch (error) {
      throw error;
    }
  }

  setOAuthConfigData(userData: any, type: string) {
    configHandler.set(this.oauthAccessTokenKeyName, userData.access_token);
    configHandler.set(this.oauthRefreshTokenKeyName, userData.refresh_token);
    configHandler.set(this.oauthDateTimeKeyName, new Date());
    if (type === 'oauth') {
      configHandler.set(this.authEmailKeyName, userData.email);
      configHandler.set(this.oauthUserUidKeyName, userData.user_uid);
      configHandler.set(this.oauthOrgUidKeyName, userData.organization_uid);
      configHandler.set(this.authorisationTypeKeyName, this.authorisationTypeOAUTHValue);
    }
  }

  setBasicAuthConfigData(userData: any) {
    configHandler.set(this.authTokenKeyName, userData.authtoken);
    configHandler.set(this.authEmailKeyName, userData.email);
    configHandler.set(this.authorisationTypeKeyName, this.authorisationTypeAUTHValue);
  }

  unsetConfigData(type = 'default') {
    const removeItems =
      type === 'refreshToken' ? this.allAuthConfigItems.refreshToken : this.allAuthConfigItems.default;
    removeItems.forEach((element) => configHandler.delete(element));
  }

  async refreshToken(): Promise<object> {
    try {
      if (!this.oauthHandler) {
        await this.initSDK(); // Initialize oauthHandler if not already initialized
      }

      const configOauthRefreshToken = configHandler.get(this.oauthRefreshTokenKeyName);
      const configAuthorisationType = configHandler.get(this.authorisationTypeKeyName);

      if (configAuthorisationType !== this.authorisationTypeOAUTHValue || !configOauthRefreshToken) {
        cliux.error('Invalid refresh token, run the command- csdx auth:login --oauth');
        throw new Error('Invalid refresh token');
      }

      const data = await this.oauthHandler.refreshAccessToken(configOauthRefreshToken);

      if (data['access_token'] && data['refresh_token']) {
        await this.setConfigData('refreshToken', data);
        return data; // Returning the data from the refresh token operation
      } else {
        throw new Error('Invalid request');
      }
    } catch (error) {
      cliux.error('An error occurred while refreshing the token');
      cliux.error(error);
      throw error; // Throwing the error to be handled by the caller
    }
  }

  async getUserDetails(data): Promise<object> {
    if (data.access_token) {
      try {
        const user = await this.managementAPIClient.getUser();
        data.email = user?.email || '';
        return data;
      } catch (error) {
        cliux.error('Error fetching user details.');
        cliux.error(error);
        throw error;
      }
    } else {
      cliux.error('Invalid/Empty access token.');
      throw new Error('Invalid/Empty access token');
    }
  }

  async oauthLogout(): Promise<object> {
    try {
      if (!this.oauthHandler) {
        await this.initSDK();
      }
      const response = await this.oauthHandler.logout();
      return response || {};
    } catch (error) {
      cliux.error('An error occurred while logging out');
      cliux.error(error);
      throw error;
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
    // Avoid recursive refresh operations
    if (this.isRefreshingToken) {
      cliux.print('Refresh operation already in progress');
      return Promise.resolve();
    }
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
          // Set the flag before refreshing the token
          this.isRefreshingToken = true;

          try {
            await this.refreshToken();
          } catch (error) {
            cliux.error('Error refreshing token');
            throw error;
          } finally {
            // Reset the flag after refresh operation is completed
            this.isRefreshingToken = false;
          }

          return Promise.resolve();
        }
      }
    } else {
      cliux.print('No OAuth set');
      this.unsetConfigData();
    }
  }

  restoreOAuthConfig() {
    const oauthAccessToken = configHandler.get(this.oauthAccessTokenKeyName);
    const oauthRefreshToken = configHandler.get(this.oauthRefreshTokenKeyName);
    const oauthDateTime = configHandler.get(this.oauthDateTimeKeyName);
    const oauthUserUid = configHandler.get(this.oauthUserUidKeyName);
    const oauthOrgUid = configHandler.get(this.oauthOrgUidKeyName);

    if (oauthAccessToken && !this.oauthHandler.getAccessToken()) this.oauthHandler.setAccessToken(oauthAccessToken);
    if (oauthRefreshToken && !this.oauthHandler.getRefreshToken()) this.oauthHandler.setRefreshToken(oauthRefreshToken);
    if (oauthUserUid && !this.oauthHandler.getUserUID()) this.oauthHandler.setUserUID(oauthUserUid);
    if (oauthOrgUid && !this.oauthHandler.getOrganizationUID()) this.oauthHandler.setOrganizationUID(oauthOrgUid);
    if (oauthDateTime && !this.oauthHandler.getTokenExpiryTime()) {
      this.oauthHandler.setTokenExpiryTime(oauthDateTime);
    }
  }
}

export default new AuthHandler();
