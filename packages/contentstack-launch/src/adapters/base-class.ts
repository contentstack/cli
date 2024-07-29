import open from 'open';
import dotEnv from 'dotenv';
import map from 'lodash/map';
import keys from 'lodash/keys';
import find from 'lodash/find';
import last from 'lodash/last';
import merge from 'lodash/merge';
import first from 'lodash/first';
import split from 'lodash/split';
import EventEmitter from 'events';
import filter from 'lodash/filter';
import replace from 'lodash/replace';
import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';
import includes from 'lodash/includes';
import cloneDeep from 'lodash/cloneDeep';
import { ApolloClient } from '@apollo/client/core';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { cliux as ux, ContentstackClient } from '@contentstack/cli-utilities';

import config from '../config';
import { print, GraphqlApiClient, LogPolling, getOrganizations } from '../util';
import {
  branchesQuery,
  frameworkQuery,
  fileFrameworkQuery,
  createDeploymentMutation,
  cmsEnvironmentVariablesQuery,
} from '../graphql';
import {
  LogFn,
  ExitFn,
  Providers,
  ConfigType,
  AdapterConstructorInputs,
  EmitMessage,
  DeploymentLogResp,
  ServerLogResp,
} from '../types';

export default class BaseClass {
  public log: LogFn;
  public exit: ExitFn;
  public config: ConfigType;
  public analyticsInfo: string;
  public $event!: EventEmitter;
  public framework!: Record<string, any>;
  public apolloClient: ApolloClient<any>;
  public projectCreationRetryCount: number = 0;
  public apolloLogsClient: ApolloClient<any> | undefined;
  public envVariables: Array<Record<string, any>> = [];
  public managementSdk: ContentstackClient | undefined;

  constructor(options: AdapterConstructorInputs) {
    const { log, exit, config, $event, apolloClient, managementSdk, analyticsInfo, apolloLogsClient } = options;
    this.config = config;
    this.$event = $event;
    this.log = log || console.log;
    this.apolloClient = apolloClient;
    this.analyticsInfo = analyticsInfo;
    this.managementSdk = managementSdk;
    this.apolloLogsClient = apolloLogsClient;
    this.exit = exit || ((code: number = 0) => process.exit(code));
  }

  /**
   * @method initApolloClient - initialize Apollo client
   *
   * @memberof BaseClass
   */
  async initApolloClient(): Promise<void> {
    this.apolloClient = await new GraphqlApiClient({
      headers: {
        'X-CS-CLI': this.analyticsInfo,
        'x-project-uid': this.config.currentConfig.uid,
        organization_uid: this.config.currentConfig.organizationUid,
      },
      baseUrl: this.config.manageApiBaseUrl,
    }).apolloClient;
  }

  /**
   * @method createNewDeployment - Create new deployment on existing launch project
   *
   * @return {*}  {Promise<void>}
   * @memberof GitHub
   */
  async createNewDeployment(skipGitData = false, uploadUid?: string): Promise<void> {
    const deployment: Record<string, any> = {
      environment: (first(this.config.currentConfig.environments) as Record<string, any>)?.uid,
    };

    if (uploadUid) {
      deployment.uploadUid = uploadUid;
    }

    await this.apolloClient
      .mutate({
        mutation: createDeploymentMutation,
        variables: { deployment, skipGitData },
      })
      .then(({ data: { deployment } }) => {
        this.log('Deployment process started.!', 'info');
        this.config.currentConfig.deployments.push(deployment);
      })
      .catch((error) => {
        this.log('Deployment process failed.!', 'error');
        this.log(error, 'error');
        this.exit(1);
      });
  }

  /**
   * @method selectOrg - select organization
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async selectOrg(): Promise<void> {
    const organizations =
      (await getOrganizations({ log: this.log, managementSdk: this.managementSdk as ContentstackClient })) || [];

    const selectedOrgUid = this.config.flags.org;

    if (selectedOrgUid) {
      const orgExists = find(organizations, { uid: selectedOrgUid });
      if (orgExists) {
        this.config.currentConfig.organizationUid = selectedOrgUid;
      } else {
        this.log('Organization UID not found!', 'error');
        this.exit(1);
      }
    } else {
      this.config.currentConfig.organizationUid = await ux
        .inquire({
          type: 'search-list',
          name: 'Organization',
          choices: organizations,
          message: 'Choose an organization',
        })
        .then((name) => (find(organizations, { name }) as Record<string, any>)?.uid);
    }

    // NOTE re initialize apollo client once org selected
    await this.initApolloClient();
  }

  /**
   * @method selectProjectType - select project type/provider/adapter
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async selectProjectType(): Promise<void> {
    const choices = [
      ...map(config.supportedAdapters, (provider) => ({
        value: provider,
        name: `Continue with ${provider}`,
      })),
      { value: 'FileUpload', name: 'Continue with FileUpload' },
    ];

    const selectedProvider: Providers = await ux.inquire({
      choices: choices,
      type: 'search-list',
      name: 'projectType',
      message: 'Choose a project type to proceed',
    });

    this.config.provider = selectedProvider;
  }

  /**
   *  @method detectFramework - detect the project framework
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async detectFramework(): Promise<void> {
    const { fullName, defaultBranch } = this.config.repository || {};
    const query = this.config.provider === 'FileUpload' ? fileFrameworkQuery : frameworkQuery;
    const variables =
      this.config.provider === 'FileUpload'
        ? {
            query: { uploadUid: this.config.uploadUid },
          }
        : {
            query: {
              provider: this.config.provider,
              repoName: fullName,
              branchName: defaultBranch,
            },
          };
    this.config.framework = (await this.apolloClient
      .query({ query, variables })
      .then(
        ({
          data: {
            framework: { framework },
          },
        }) => framework,
      )
      .catch((_error) => {
        // this.log("Something went wrong. Please try again.", "warn");
        // this.log(error, "error");
        // this.exit(1);
      })) || {
      envVariables: '',
    };

    const choices = [];
    const framework = find(this.config.listOfFrameWorks, ({ value }) => value === this.config.framework)?.name;

    if (framework) {
      choices.push({
        name: framework,
        value: this.config.framework,
      });
    }

    choices.push(...filter(this.config.listOfFrameWorks, ({ value }) => value !== this.config.framework));

    this.config.framework = await ux.inquire({
      choices,
      type: 'search-list',
      name: 'frameworkPreset',
      message: 'Framework Preset',
      default: this.config.framework,
    });
  }

  /**
   *  @method getCmsEnvironmentVariables - get list of environment variables
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async getCmsEnvironmentVariables(): Promise<void> {
    this.envVariables = (await this.apolloClient
      .query({ query: cmsEnvironmentVariablesQuery })
      .then(({ data: { envVariables } }) => envVariables)
      .catch((error) => this.log(error, 'error'))) || {
      envVariables: undefined,
    };
  }

  /**
   * @method selectStack - Select stack to import variables, tokens
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async selectStack(): Promise<void> {
    const listOfStacks =
      (await this.managementSdk
        ?.stack()
        .query({ organization_uid: this.config.currentConfig.organizationUid })
        .find()
        .then(({ items }) => map(items, ({ name, api_key }) => ({ name, value: name, api_key })))
        .catch((error) => {
          this.log('Unable to fetch stacks.!', { color: 'yellow' });
          this.log(error, 'error');
          this.exit(1);
        })) || [];

    if (this.config.selectedStack) {
      this.config.selectedStack = find(listOfStacks, { api_key: this.config.selectedStack });
    } else {
      this.config.selectedStack = await ux
        .inquire({
          name: 'stack',
          type: 'search-list',
          choices: listOfStacks,
          message: 'Stack',
        })
        .then((name) => find(listOfStacks, { name }));
    }
  }

  /**
   * @method selectDeliveryToken - Select delivery token from a stack
   *
   * @return {*}  {Promise<any>}
   * @memberof BaseClass
   */
  async selectDeliveryToken(): Promise<any> {
    const listOfDeliveryTokens =
      (await this.managementSdk
        ?.stack({ api_key: this.config.selectedStack.api_key })
        .deliveryToken()
        .query()
        .find()
        .then(({ items }) =>
          map(items, ({ name, token, scope }) => ({
            name,
            token,
            scope,
            value: name,
          })),
        )
        .catch((error) => {
          this.log('Unable to fetch the delivery token!', 'warn');
          this.log(error, 'error');
          this.exit(1);
        })) || [];

    if (this.config.deliveryToken) {
      this.config.deliveryToken = find(listOfDeliveryTokens, { token: this.config.deliveryToken });
    } else {
      this.config.deliveryToken = await ux
        .inquire({
          type: 'search-list',
          name: 'deliveryToken',
          choices: listOfDeliveryTokens,
          message: 'Delivery token',
        })
        .then((name) => find(listOfDeliveryTokens, { name }) as Record<string, any>);
    }
    this.config.environment = this.config.deliveryToken?.scope[0]?.environments[0]?.name;
  }

  /**
   * @method promptForEnvValues - Prompt and get manual entry of environment variables
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async promptForEnvValues(): Promise<void> {
    let addNew = true;
    const envVariables = [];

    if (!this.config.envVariables) {
      do {
        const variable = await ux
          .inquire({
            type: 'input',
            name: 'variable',
            message:
              'Enter key and value with a colon between them, and use a comma(,) for the key-value pair. Format: <key1>:<value1>, <key2>:<value2> Ex: APP_ENV:prod, TEST_ENV:testVal',
          })
          .then((variable) => {
            return map(split(variable as string, ','), (variable) => {
              let [key, value] = split(variable as string, ':');
              value = (value || '').trim();
              key = (key || '').trim();

              return { key, value };
            }).filter(({ key }) => key);
          });

        envVariables.push(...variable);

        if (
          !(await ux.inquire({
            type: 'confirm',
            name: 'canImportFromStack',
            message: 'Would you like to add more variables?',
          }))
        ) {
          addNew = false;
        }
      } while (addNew);

      this.envVariables.push(...envVariables);
    } else {
      if (typeof this.config.envVariables === 'string') {
        const variable = map(split(this.config.envVariables as string, ','), (variable) => {
          let [key, value] = split(variable as string, ':');
          value = (value || '').trim();
          key = (key || '').trim();

          return { key, value };
        });
        this.envVariables.push(...variable);
      }
    }
  }

  /**
   * @method prepareLaunchConfig - prepare and write launch config in to dist.
   *
   * @memberof BaseClass
   */
  prepareLaunchConfig(): void {
    let data: Record<string, any> = {};

    if (this.config.config && existsSync(this.config.config)) {
      data = require(this.config.config);
    }

    if (this.config.branch) {
      data[this.config.branch] = this.config.currentConfig;
    } else {
      data.project = this.config.currentConfig;
    }

    writeFileSync(`${this.config.projectBasePath}/${this.config.configName}`, JSON.stringify(data), {
      encoding: 'utf8',
      flag: 'w',
    });
  }

  /**
   * @method connectToAdapterOnUi - Open browser to connect with adapter with launch (GitHub etc.,)
   *
   * @param {boolean} [emit=true]
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async connectToAdapterOnUi(emit = true): Promise<void> {
    await this.selectProjectType();

    if (includes(this.config.supportedAdapters, this.config.provider)) {
      const baseUrl = this.config.host.startsWith('http') ? this.config.host : `https://${this.config.host}`;

      const gitHubConnectUrl = `${baseUrl.replace('api', 'app').replace('io', 'com')}/#!/launch`;
      this.log(`You can connect your ${this.config.provider} account to the UI using the following URL:`, 'info');
      this.log(gitHubConnectUrl, { color: 'green' });
      open(gitHubConnectUrl);
      this.exit(1);
    } else if (emit) {
      this.$event.emit('provider-changed');
    }
  }

  /**
   * @method queryBranches - Query all paginated branches
   *
   * @param {Record<string, any>} variables
   * @param {any[]} [branchesRes=[]]
   * @return {*}  {Promise<any[]>}
   * @memberof BaseClass
   */
  async queryBranches(variables: Record<string, any>, branchesRes: any[] = []): Promise<any[]> {
    const branches = await this.apolloClient
      .query({
        query: branchesQuery,
        variables,
      })
      .then(({ data: { branches } }) => branches)
      .catch((error) => {
        this.log('Something went wrong. Please try again.', 'warn');
        this.log(error, 'error');
        this.exit(1);
      });

    if (branches) {
      branchesRes.push(...map(branches.edges, 'node'));

      if (branches.pageInfo.hasNextPage) {
        variables.page = branches.pageData.page + 1;
        return await this.queryBranches(variables, branchesRes);
      }
    }

    return branchesRes;
  }

  /**
   * @method selectBranch - Select a branch for launch process
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async selectBranch(): Promise<void> {
    const variables = {
      page: 1,
      first: 100,
      query: {
        provider: this.config.provider,
        repoName: this.config.repository?.fullName,
      },
    };

    const branches: Record<string, any>[] = await this.queryBranches(variables);

    if (branches && this.config.flags.branch && find(branches, { name: this.config.flags.branch })) {
      this.config.branch = this.config.flags.branch as any;
    } else {
      if (this.config.flags.branch) {
        this.log('Branch name not found!', 'warn');
      }

      this.config.branch = await ux.inquire({
        name: 'branch',
        message: 'Branch',
        type: 'search-list',
        choices: map(branches, 'name'),
        default: this.config.repository?.defaultBranch,
      });
    }
  }

  /**
   * @method inquireRequireValidation - Required validation for prompt
   *
   * @param {*} input
   * @return {*}  {(string | boolean)}
   * @memberof BaseClass
   */
  inquireRequireValidation(input: any): string | boolean {
    if (isEmpty(input)) {
      return "This field can't be empty.";
    }

    return true;
  }

  /**
   * @method handleEnvImportFlow - Manage variables flow whether to import or manual input.
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async handleEnvImportFlow(): Promise<void> {
    const variablePreparationType =
      this.config.variableType ||
      (await ux.inquire({
        type: 'checkbox',
        name: 'variablePreparationType',
        default: this.config.framework,
        choices: this.config.variablePreparationTypeOptions,
        message: 'Import variables from a stack and/or manually add custom variables to the list',
        // validate: this.inquireRequireValidation,
      }));

    if (includes(variablePreparationType, 'Import variables from a stack')) {
      await this.importEnvFromStack();
    }
    if (includes(variablePreparationType, 'Manually add custom variables to the list')) {
      await this.promptForEnvValues();
    }
    if (includes(variablePreparationType, 'Import variables from the local env file')) {
      await this.importVariableFromLocalConfig();
    }

    if (this.envVariables.length) {
      this.printAllVariables();
    } else {
      this.log('Please provide env file!', 'error');
      this.exit(1);
    }
  }

  /**
   * @method importVariableFromLocalConfig - Import environment variable from local config
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async importVariableFromLocalConfig(): Promise<void> {
    const localEnv =
      dotEnv.config({
        path: `${this.config.projectBasePath}/.env.local`,
      }).parsed ||
      dotEnv.config({
        path: this.config.projectBasePath,
      }).parsed;

    if (!isEmpty(localEnv)) {
      let envKeys: Record<string, any> = keys(localEnv);
      const existingEnvKeys = map(this.envVariables, 'key');
      const localEnvData = map(envKeys, (key) => ({
        key,
        value: localEnv[key],
      }));

      if (find(existingEnvKeys, (key) => includes(envKeys, key))) {
        this.log('Duplicate environment variable keys found.', 'warn');
        if (
          await ux.inquire({
            default: false,
            type: 'confirm',
            name: 'deployLatestSource',
            message: 'Would you like to keep the local environment variables?',
          })
        ) {
          this.envVariables = merge(this.envVariables, localEnvData);
        } else {
          this.envVariables = merge(localEnvData, this.envVariables);
        }
      } else {
        this.envVariables.push(...localEnvData);
      }
    }
  }

  /**
   * @method importEnvFromStack - Import environment variables from stack
   *
   * @return {*}  {Promise<void>}
   * @memberof BaseClass
   */
  async importEnvFromStack(): Promise<void> {
    await this.selectStack();
    await this.selectDeliveryToken();
    print([
      { message: '?', color: 'green' },
      { message: 'Stack Environment', bold: true },
      { message: this.config.environment || '', color: 'cyan' },
    ]);
    await this.getCmsEnvironmentVariables();

    this.envVariables = map(cloneDeep(this.envVariables), (variable) => {
      switch (variable.key) {
        case 'CONTENTSTACK_API_HOST':
        case 'CONTENTSTACK_CDN':
          if (variable.value.startsWith('http')) {
            const url = new URL(variable.value);
            variable.value = url?.host || this.config.host;
          }
          break;
        case 'CONTENTSTACK_ENVIRONMENT':
          variable.value = this.config.environment;
          break;
        case 'CONTENTSTACK_API_KEY':
          variable.value = this.config.selectedStack.api_key;
          break;
        case 'CONTENTSTACK_DELIVERY_TOKEN':
          variable.value = this.config.deliveryToken?.token;
          break;
      }

      return variable;
    });
  }

  /**
   * @method printAllVariables - Print/Display all variables on ui
   *
   * @memberof BaseClass
   */
  printAllVariables(): void {
    ux.table(
      [
        ...(this.config.flags['show-variables']
          ? this.envVariables
          : this.envVariables.map(({ key, value }) => ({
              key,
              value: replace(value, /./g, '*'),
            }))),
        { key: '', value: '' },
      ],
      {
        key: {
          minWidth: 7,
        },
        value: {
          minWidth: 7,
        },
      },
    );
  }

  /**
   * @method showLogs - show deployment logs on terminal/UI
   *
   * @return {*}  {Promise<boolean>}
   * @memberof BaseClass
   */
  async showLogs(): Promise<boolean> {
    this.apolloLogsClient = await new GraphqlApiClient({
      headers: {
        'X-CS-CLI': this.analyticsInfo,
        'x-project-uid': this.config.currentConfig.uid,
        organization_uid: this.config.currentConfig.organizationUid,
      },
      baseUrl: this.config.logsApiBaseUrl,
    }).apolloClient;
    this.apolloClient = await new GraphqlApiClient({
      headers: {
        'X-CS-CLI': this.analyticsInfo,
        'x-project-uid': this.config.currentConfig.uid,
        organization_uid: this.config.currentConfig.organizationUid,
      },
      baseUrl: this.config.manageApiBaseUrl,
    }).apolloClient;
    this.config.environment = (last(this.config.currentConfig.environments) as Record<string, any>)?.uid;
    this.config.deployment = (last(this.config.currentConfig.deployments) as Record<string, any>)?.uid;
    const logs = new LogPolling({
      config: this.config,
      $event: this.$event,
      apolloManageClient: this.apolloClient,
      apolloLogsClient: this.apolloLogsClient,
    });
    logs.deploymentLogs();
    return new Promise<boolean>((resolve) => {
      this.$event.on('deployment-logs', (event: EmitMessage) => {
        const { message, msgType } = event;
        if (message === 'DONE') return resolve(true);

        if (msgType === 'info') {
          forEach(message, (log: DeploymentLogResp | ServerLogResp) => {
            let formattedLogTimestamp = new Date(log.timestamp).toISOString()?.slice(0, 23)?.replace('T', ' ');
            this.log(`${formattedLogTimestamp}:  ${log.message}`, msgType);
          });
        } else if (msgType === 'error') {
          this.log(message, msgType);
          resolve(true);
        }
      });
    });
  }

  /**
   * @method handleNewProjectCreationError
   *
   * @param {*} error
   * @return {*}  {(Promise<boolean | void>)}
   * @memberof BaseClass
   */
  async handleNewProjectCreationError(error: any): Promise<boolean | void> {
    this.log('New project creation failed!', 'error');

    if (includes(error?.graphQLErrors?.[0]?.extensions?.exception?.messages, 'launch.PROJECTS.DUPLICATE_NAME')) {
      this.log('Duplicate project name identified', 'error');

      if (this.projectCreationRetryCount >= this.config.projectCreationRetryMaxCount) {
        this.log('Reached max project creation retry limit', 'warn');
      } else if (
        await ux.inquire({
          type: 'confirm',
          name: 'deployLatestSource',
          message: "Would you like to change the project's name and try again?",
        })
      ) {
        this.config.projectName = await ux.inquire({
          type: 'input',
          name: 'projectName',
          message: 'Project Name',
          default: this.config.repository?.name,
          validate: this.inquireRequireValidation,
        });

        this.projectCreationRetryCount++;

        return true;
      }
    } else if (includes(error?.graphQLErrors?.[0]?.extensions?.exception?.messages, 'launch.PROJECTS.LIMIT_REACHED')) {
      this.log('Launch project limit reached!', 'error');
    } else {
      this.log(error, 'error');
    }
    this.exit(1);
  }

  /**
   * @method showDeploymentUrl - show deployment URL and open it on browser
   *
   * @param {boolean} [openOnUi=true]
   * @memberof BaseClass
   */
  showDeploymentUrl(openOnUi = true): void {
    const deployment = last(this.config.currentConfig.deployments) as Record<string, any>;

    if (deployment) {
      const deploymentUrl = deployment.deploymentUrl.startsWith('https')
        ? deployment.deploymentUrl
        : `https://${deployment.deploymentUrl}`;
      print([
        { message: 'Deployment URL', bold: true },
        { message: deploymentUrl, color: 'cyan' },
      ]);

      if (openOnUi) {
        // NOTE delaying to open the deployment url. If we open quickly it's showing site not reachable
        setTimeout(() => {
          open(deploymentUrl);
        }, 6000);
      }
    }
  }

  /**
   * @method showSuggestion - Show suggestion to add config file to .gitignore
   *
   * @return {*}
   * @memberof GitHub
   */
  showSuggestion() {
    const gitIgnoreFilePath = `${this.config.projectBasePath}/.gitignore`;

    if (existsSync(gitIgnoreFilePath)) {
      const gitIgnoreFile = readFileSync(`${this.config.projectBasePath}/.gitignore`, 'utf-8');

      if (includes(gitIgnoreFile, this.config.configName)) return;

      this.log(`You can add the ${this.config.configName} config file to the .gitignore file`, {
        color: 'yellow',
        bold: true,
      });
    }
  }
}
