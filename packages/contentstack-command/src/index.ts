import { Command, flags } from '@oclif/command';
import * as ContentstackManagementSDK from '@contentstack/management';
import * as ContentstackDeliverySDK from 'contentstack';
import * as url from 'url';
import { configHandler, CLIError } from '@contentstack/cli-utilities';
import { Region } from './interfaces';

const defaultRateLimit = 5;

abstract class ContentstackCommand extends Command {
  private _managementAPIClient: object;
  private _email: string;
  private _region: Region;
  private _rateLimit: string;
  private _authToken: string;
  private _deliveryAPIClient: any;

  get context() {
    // @ts-ignore

    return  {
      id: '9edc57bb-5703-4df3-83c2-d11a9c80e817',
      user: {
        authtoken: 'bltdfbb61559a919b2d',
        email: 'shafeeq.pp@contentstack.com'
      },
      config: {
        '0': 'r',
        '1': 'e',
        '2': 'g',
        '3': 'i',
        '4': 'o',
        '5': 'n',
        uuid: '074b8565-394b-4a7d-9baf-6ee197084f59',
        tokens: { 'mtoken-dev9': [Object] },
        sessionId: '9edc57bb-5703-4df3-83c2-d11a9c80e817',
        logger: { level: 'debug', enabled: true },
        region: {
          cma: 'https://stag-api.contentstack.io',
          cda: 'https://stag-cdn.contentstack.io',
          name: 'stage'
        },
        authtoken: 'bltdfbb61559a919b2d',
        email: 'shafeeq.pp@contentstack.com'
      },
      region: {
        cma: 'https://stag-api.contentstack.io',
        cda: 'https://stag-cdn.contentstack.io',
        name: 'stage'
      },
      info: { command: 'cm:import' },
      plugin: {
        options: {
          type: 'core',
          root: '/home/shafeeqpp/WORKSPACE/CLI/cli/packages/contentstack',
          name: '@contentstack/cli-cm-import'
        },
        _base: '@oclif/config@1.17.0',
        valid: true,
        alreadyLoaded: false,
        children: [],
        _debug: [Function],
        warned: false,
        type: 'core',
        tag: undefined,
        root: '/home/shafeeqpp/WORKSPACE/CLI/cli/packages/contentstack/node_modules/@contentstack/cli-cm-import',
        pjson: {
          name: '@contentstack/cli-cm-import',
          description: 'Contentstack CLI plugin to import content into stack',
          version: '0.1.1-beta.1',
          author: 'Contentstack',
          bugs: 'https://github.com/contentstack/cli/issues',
          scripts: [Object],
          dependencies: [Object],
          devDependencies: [Object],
          engines: [Object],
          files: [Array],
          homepage: 'https://github.com/contentstack/cli',
          keywords: [Array],
          license: 'MIT',
          oclif: [Object],
          husky: [Object],
          repository: 'contentstack/cli'
        },
        name: '@contentstack/cli-cm-import',
        version: '0.1.1-beta.1',
        hooks: {},
        manifest: { version: '0.1.1-beta.1', commands: [Object] },
        commands: [ [Object] ],
        config: {}
      },
      messageFilePath: '/home/shafeeqpp/WORKSPACE/CLI/cli/packages/contentstack/node_modules/@contentstack/cli-cm-import/messages/index.json'
    }
    // return this.config.context;
  }

  get managementAPIClient() {
    if (this._managementAPIClient) return this._managementAPIClient;
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost });
    return this._managementAPIClient;
  }

  set managementAPIClient(params) {
    this._managementAPIClient = ContentstackManagementSDK.client(params);
  }

  get email() {
    if (this._email) return this._email;
    this._email = configHandler.get('email');
    if (this._email) return this._email;
    throw new CLIError({ message: 'No email found' });
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
    throw new CLIError({ message: 'You are not logged in. Please login with command $ csdx auth:login' });
  }

  getToken(alias) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
    throw new CLIError({ message: 'No token found' });
  }
}

module.exports = {
  Command: ContentstackCommand,
  flags,
};
