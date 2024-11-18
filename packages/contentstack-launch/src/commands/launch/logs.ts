import map from 'lodash/map';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import isArray from 'lodash/isArray';
import includes from 'lodash/includes';
import { Flags, FlagInput, cliux as ux } from '@contentstack/cli-utilities';

import { BaseCommand } from '../../base-command';
import { environmentsQuery } from '../../graphql';
import { Logger, LogPolling, selectOrg, selectProject } from '../../util';
import { EmitMessage, DeploymentLogResp, ServerLogResp } from '../../types';

export default class Logs extends BaseCommand<typeof Logs> {
  static description = 'Show deployment or server logs';

  static examples = [
    '$ csdx launch:logs',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir>',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir> --type <options: d|s>',
    '$ csdx launch:logs --config <path/to/launch/config/file> --type <options: d|s>',
    '$ csdx launch:logs --deployment=deployment',
    '$ csdx launch:logs --environment=environment',
    '$ csdx launch:logs --environment=environment --deployment=deployment',
    '$ csdx launch:logs --environment=environment --type <options: d|s>',
    '$ csdx launch:logs --environment=environment --data-dir <path/of/current/working/dir> --deployment=deployment',
    '$ csdx launch:logs --environment=environment --config <path/to/launch/config/file> --deployment=deployment',
  ];

  static flags: FlagInput = {
    environment: Flags.string({
      char: 'e',
      description: 'Environment name or UID',
    }),
    deployment: Flags.string({
      description: 'Deployment number or UID',
    }),
    type: Flags.string({
      required: false,
      default: 's',
      multiple: false,
      options: ['d', 's'],
      description: `Choose type of flags to show logs
      d) Deployment logs
      s) Server logs
      `,
    }),
    org: Flags.string({
      description: '[Optional] Provide the organization UID',
    }),
    project: Flags.string({
      description: '[Optional] Provide the project UID',
    }),
  };

  async run(): Promise<void> {
    await this.getConfig();
    await this.prepareApiClients();
    await this.logPollingAndInitConfig();
  }

  /**
   * @method logPollingAndInitConfig - prepare and initialize the configurations
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async logPollingAndInitConfig(): Promise<void> {
    this.logger = new Logger(this.sharedConfig);
    this.log = this.logger.log.bind(this.logger);

    await this.checkAndSetProjectDetails();

    let logPolling = new LogPolling({
      apolloLogsClient: this.apolloLogsClient,
      apolloManageClient: this.apolloClient,
      config: this.sharedConfig,
      $event: this.$event,
    });
    if (this.flags.type === 's') {
      this.$event.on('server-logs', (event: EmitMessage) => {
        this.showLogs(event);
      });
      await logPolling.serverLogs();
    } else {
      this.$event.on('deployment-logs', (event: EmitMessage) => {
        this.showLogs(event);
      });
      await logPolling.deploymentLogs();
    }
  }

  /**
   * @method checkAndSetProjectDetails - validate and set project details like organizationUid, uid, environment, deployment
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async checkAndSetProjectDetails(): Promise<void> {
    if (!this.sharedConfig.currentConfig.uid) {
      await selectOrg({
        log: this.log,
        flags: this.flags,
        config: this.sharedConfig,
        managementSdk: this.managementSdk,
      });
      await this.prepareApiClients(); // NOTE update org-id in header
      await selectProject({
        log: this.log,
        flags: this.flags,
        config: this.sharedConfig,
        apolloClient: this.apolloClient,
      });
      await this.prepareApiClients(); // NOTE update project-id in header
    }
    await this.validateAndSelectEnvironment();
    if (this.flags.deployment) {
      await this.validateDeployment();
    } else {
      await this.fetchLatestDeployment();
    }
  }

  /**
   * @method selectEnvironment - select environment
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async selectEnvironment(): Promise<void> {
    if (!this.sharedConfig.currentConfig.environments) {
      this.log('Environment(s) not found!', 'error');
      process.exit(1);
    }
    const environments = map(this.sharedConfig.currentConfig.environments, ({ node: { uid, name, deployments } }) => ({
      name,
      value: name,
      uid,
      deployments,
    }));
    this.sharedConfig.environment = await ux
      .inquire({
        type: 'search-list',
        name: 'Environment',
        choices: environments,
        message: 'Choose an environment',
      })
      .then((name: any) => (find(environments, { name }) as Record<string, any>)?.uid);
    this.sharedConfig.currentConfig.deployments = environments[0]?.deployments?.edges;
  }

  /**
   * @method validateAndSelectEnvironment - check whether environment is validate or not. If not then option to select environment
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async validateAndSelectEnvironment(): Promise<void> {
    const environments = await this.apolloClient
      .query({ query: environmentsQuery })
      .then(({ data: { Environments } }) => Environments)
      .catch((error) => {
        this.log(error?.message, 'error');
        process.exit(1);
      });
    const envDetail = find(environments.edges, ({ node: { uid, name } }) => {
      return name === this.flags.environment || uid === this.flags.environment;
    });
    if (envDetail) {
      this.sharedConfig.environment = envDetail.node.uid;
      this.sharedConfig.currentConfig.deployments = envDetail.node.deployments.edges;
    } else {
      this.sharedConfig.currentConfig.environments = environments.edges;
      await this.selectEnvironment();
    }
  }

  /**
   * @method validateDeployment - check whether deployment is validate or not.
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async validateDeployment(): Promise<void> {
    if (!this.sharedConfig.currentConfig.deployments) {
      this.log('Deployment not found!', 'error');
      process.exit(1);
    }
    const deploymentDetail = find(
      this.sharedConfig.currentConfig.deployments,
      ({ node: { uid, deploymentNumber } }) => {
        return deploymentNumber === +this.flags.deployment || uid === this.flags.deployment;
      },
    );
    if (deploymentDetail) {
      this.sharedConfig.deployment = deploymentDetail.node.uid;
    } else {
      this.log('Deployment name or UID not found!', 'error');
      process.exit(1);
    }
  }

  /**
   * @method showLogs - display emit messages.
   *
   * @return {*}  {void}
   * @memberof Logs
   */
  showLogs(event: EmitMessage): void {
    const { message, msgType } = event;
    if (msgType === 'info') {
      forEach(message, (log: DeploymentLogResp | ServerLogResp) => {
        let formattedLogTimestamp = new Date(log.timestamp).toISOString()?.slice(0, 23)?.replace('T', ' ');
        this.log(`${formattedLogTimestamp}:  ${log.message}`, msgType);
      });
    } else if (msgType === 'error') {
      if (isArray(message)) {
        if (includes(map(message, 'extensions.exception.name'), 'NoServerlessRoutesError')) {
          this.log('No server logs to display', 'info');
          process.exit();
        }
      }
      this.log(message, msgType);
    }
  }

  /**
   * @method fetchLatestDeployment - fetch latest deployment details.
   *
   * @return {*} {Promise<void>}
   * @memberof Logs
   */
  async fetchLatestDeployment(): Promise<void> {
    if (!this.sharedConfig.currentConfig.deployments) {
      this.log('Deployment not found!', 'error');
      process.exit(1);
    } else {
      let lastDeploymentDetails = this.sharedConfig.currentConfig.deployments[0];
      if (lastDeploymentDetails?.node?.uid) {
        this.sharedConfig.deployment = lastDeploymentDetails.node.uid;
      } else {
        this.log('Deployment not found!', 'error');
        process.exit(1);
      }
    }
  }
}
