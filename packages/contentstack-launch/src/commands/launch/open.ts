import open from 'open';
import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { FlagInput, Flags, cliux as ux } from '@contentstack/cli-utilities';

import { BaseCommand } from '../../base-command';
import { environmentsQuery } from '../../graphql';
import { print, Logger, selectOrg, selectProject } from '../../util';

export default class Open extends BaseCommand<typeof Open> {
  static description = 'Open a website for an environment';

  static examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> --config <path/to/launch/config/file>',
    '$ <%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir>',
    '$ <%= config.bin %> <%= command.id %> --environment=environment',
    '$ <%= config.bin %> <%= command.id %> --environment=environment --config <path/to/launch/config/file>',
    '$ <%= config.bin %> <%= command.id %> --environment=environment --data-dir <path/of/current/working/dir>',
  ];

  static flags: FlagInput = {
    org: Flags.string({
      description: '[Optional] Provide the organization UID',
    }),
    project: Flags.string({
      description: '[Optional] Provide the project UID',
    }),
    environment: Flags.string({
      char: 'e',
      description: 'Environment name or UID',
    }),
    branch: Flags.string({
      hidden: true,
      description: '[Optional] GitHub branch name',
    }),
  };

  async run(): Promise<void> {
    this.logger = new Logger(this.sharedConfig);
    this.log = this.logger.log.bind(this.logger);

    if (!this.flags.environment) await this.getConfig();

    if (this.sharedConfig.currentConfig?.uid && !isEmpty(this.sharedConfig.currentConfig?.deployments)) {
      this.openWebsite();
    } else {
      await this.prepareProjectDetails();
    }
  }

  /**
   * @method openWebsite - Open website URL on browser
   *
   * @memberof Open
   */
  openWebsite() {
    const [deployment] = this.sharedConfig.currentConfig?.deployments || [];

    if (!isEmpty(deployment)) {
      const deploymentUrl = deployment.deploymentUrl?.startsWith('https')
        ? deployment.deploymentUrl
        : `https://${deployment.deploymentUrl}`;
      print([
        { message: 'Deployment URL', bold: true },
        { message: deploymentUrl, color: 'cyan' },
      ]);
      open(deploymentUrl);
    } else {
      this.log('Website URL not found.!', 'error');
      this.exit(1);
    }
  }

  /**
   * @method checkAndSetProjectDetails - validate and set project details (ex. organizationUid, uid, environment, deployment)
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async prepareProjectDetails(): Promise<void> {
    // NOTE to get environment project UID must be passed as header
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

    this.openWebsite();
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
    const envDetail = find(
      environments.edges,
      ({ node: { uid, name } }) => name === this.flags.environment || uid === this.flags.environment,
    );

    if (envDetail) {
      this.sharedConfig.environment = envDetail.node.uid;
      this.sharedConfig.currentConfig.deployments = map(envDetail.node.deployments.edges, 'node');
    } else {
      this.sharedConfig.currentConfig.environments = environments.edges;
      await this.selectEnvironment();
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
    this.sharedConfig.currentConfig.deployments = map(environments[0]?.deployments?.edges, 'node');
  }
}
