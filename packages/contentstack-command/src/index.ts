import * as ContentstackDeliverySDK from 'contentstack';
import * as url from 'url';
import { configHandler, CLIError, Command } from '@contentstack/cli-utilities';
import { Region } from './interfaces';

const defaultRateLimit = 5;

abstract class ContentstackCommand extends Command {
  private _email: string;
  private _region: Region;
  private _rateLimit: string;
  private _authToken: string;
  private _deliveryAPIClient: any;

  get context() {
    // @ts-ignore
    return this.config.context || {};
  }

  get email() {
    if (this._email) return this._email;
    this._email = configHandler.get('email');
    if (this._email) return this._email;
    throw new CLIError('You are not logged in. Please login with command $ csdx auth:login');
  }

  get deliveryAPIClient() {
    if (this._deliveryAPIClient) return this._deliveryAPIClient;
    this._deliveryAPIClient = ContentstackDeliverySDK;
    return this._deliveryAPIClient;
  }

  get region() {
    if (this._region) return this._region;
    this._region = configHandler.get('region');
    if (this._region) return this._region;
  }

  get rateLimit() {
    this._rateLimit = configHandler.get('rate-limit');
    if (this._rateLimit) return this._rateLimit;
    return defaultRateLimit;
  }

  get cmaHost() {
    let cma = this.region.cma;
    if (cma.startsWith('http')) {
      const u = url.parse(cma);
      if (u.host) return u.host;
    }
    return cma;
  }

  get cdaHost() {
    let cda = this.region.cda;
    if (cda.startsWith('http')) {
      const u = url.parse(cda);
      if (u.host) return u.host;
    }
    return cda;
  }

  get cdaAPIUrl() {
    let cda = this.region.cda;
    return cda.startsWith('http') ? cda : `https://${cda}`;
  }

  get cmaAPIUrl() {
    let cma = this.region.cma;
    return cma.startsWith('http') ? cma : `https://${cma}`;
  }

  get authToken() {
    if (this._authToken) return this._authToken;
    this._authToken = configHandler.get('authtoken');
    if (this._authToken) return this._authToken;
  }

  getToken(alias) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
    throw new CLIError('No token found');
  }

  isAuthenticated() {
    const authtoken = configHandler.get('authtoken');
    if (authtoken) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = {
  Command: ContentstackCommand,
};

export { ContentstackCommand as Command};
