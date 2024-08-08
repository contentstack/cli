import keys from 'lodash/keys';
import { existsSync } from 'fs';
import EventEmitter from 'events';
import { dirname, resolve } from 'path';
import includes from 'lodash/includes';
import { ApolloClient } from '@apollo/client/core';
import { Command } from '@contentstack/cli-command';
import {
  Flags,
  FlagInput,
  Interfaces,
  cliux as ux,
  configHandler,
  isAuthenticated,
  ContentstackClient,
  managementSDKClient,
  managementSDKInitiator,
} from '@contentstack/cli-utilities';

import config from './config';
import { getLaunchHubUrl, GraphqlApiClient, Logger } from './util';
import { ConfigType, LogFn, Providers } from './types';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  public log!: LogFn;
  public logger!: Logger;
  protected $event!: EventEmitter;
  protected sharedConfig!: ConfigType;
  protected apolloClient!: ApolloClient<any>;
  protected managementSdk!: ContentstackClient;
  protected apolloLogsClient!: ApolloClient<any>;

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags: FlagInput = {
    'data-dir': Flags.string({
      char: 'd',
      description: 'Current working directory',
    }),
    config: Flags.string({
      char: 'c',
      description: `Path to the local '${config.configName}' file`,
    }),
  };

  public async init(): Promise<void> {
    this.checkAuthenticated();
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    ux.registerSearchPlugin();
    this.$event = new EventEmitter();

    await this.prepareConfig();
    await this.initCmaSDK();

    // Init logger
    const logger = new Logger(this.sharedConfig);
    this.log = logger.log.bind(logger);
  }

  public checkAuthenticated() {
    const self = this;
    if ((self as this & { id: string }).id === 'launch:functions') {
      return;
    }
    const _isAuthenticated = isAuthenticated();
    if (!_isAuthenticated) {
      ux.print('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' });
      ux.print('You are not logged in. Please login to execute this command, csdx auth:login', { color: 'red' });
      this.exit(1);
    }
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_);
  }

  /**
   * @method prepareConfig - init default Config data
   *
   * @memberof BaseCommand
   */
  async prepareConfig(): Promise<void> {
    let configPath =
      this.flags['data-dir'] || this.flags.config
        ? this.flags.config || resolve(this.flags['data-dir'], config.configName)
        : resolve(process.cwd(), config.configName);
    const baseUrl = config.launchBaseUrl || getLaunchHubUrl();
    this.sharedConfig = {
      ...require('./config').default,
      currentConfig: {},
      ...this.flags,
      flags: this.flags,
      host: this.cmaHost,
      config: configPath,
      projectBasePath: dirname(configPath),
      authtoken: configHandler.get('authtoken'),
      authType: configHandler.get('authorisationType'),
      authorization: configHandler.get('oauthAccessToken'),
      logsApiBaseUrl: `${baseUrl}/${config.logsApiEndpoint}`,
      manageApiBaseUrl: `${baseUrl}/${config.manageApiEndpoint}`,
    };

    if (this.flags.type) {
      this.sharedConfig.provider = this.flags.type;
    }

    if (existsSync(configPath)) {
      this.sharedConfig.isExistingProject = true;
    }
  }

  /**
   * @method getConfig - Get a config from list of existing .cs-launch.json file
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseCommand
   */
  async getConfig(): Promise<void> {
    if (this.sharedConfig.config && existsSync(this.sharedConfig.config)) {
      const config: Record<string, any> = require(this.sharedConfig.config);
      const configKeys = keys(config);

      if (this.flags.branch && includes(configKeys, this.flags.branch)) {
        this.sharedConfig.currentConfig = config[this.flags.branch];
      } else if (configKeys?.length > 1) {
        this.sharedConfig.currentConfig = await ux
          .inquire({
            name: 'branch',
            type: 'search-list',
            choices: configKeys,
            message: 'Choose a branch',
          })
          .then((val: any) => config[val])
          .catch((err) => {
            this.log(err, 'error');
          });
      } else {
        this.sharedConfig.currentConfig = config[configKeys[0]];
      }

      this.sharedConfig.provider = (this.sharedConfig.providerMapper as Record<string, string>)[
        this.sharedConfig.currentConfig.projectType
      ] as Providers;
    }
  }

  /**
   * @methods prepareApiClients - Prepare Api Clients (Management SDK and apollo client)
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseCommand
   */
  async prepareApiClients(): Promise<void> {
    this.apolloClient = await new GraphqlApiClient({
      headers: {
        'X-CS-CLI': this.context.analyticsInfo,
        'x-project-uid': this.sharedConfig.currentConfig.uid,
        organization_uid: this.sharedConfig.currentConfig.organizationUid,
      },
      baseUrl: this.sharedConfig.manageApiBaseUrl,
    }).apolloClient;
    this.apolloLogsClient = await new GraphqlApiClient({
      headers: {
        'X-CS-CLI': this.context.analyticsInfo,
        'x-project-uid': this.sharedConfig.currentConfig.uid,
        organization_uid: this.sharedConfig.currentConfig.organizationUid,
      },
      baseUrl: this.sharedConfig.logsApiBaseUrl,
    }).apolloClient;
  }

  /**
   * @method initCmaSDK
   *
   * @memberof BaseCommand
   */
  async initCmaSDK() {
    managementSDKInitiator.init(this.context);
    this.managementSdk = await managementSDKClient({
      host: this.sharedConfig.host,
    });
  }
}
