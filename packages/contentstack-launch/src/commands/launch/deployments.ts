import chalk from 'chalk';
import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { FlagInput, Flags, cliux as ux } from '@contentstack/cli-utilities';

import { Logger } from '../../util';
import { BaseCommand } from './base-command';
import { environmentsQuery, projectsQuery } from '../../graphql';

export default class Deployments extends BaseCommand<typeof Deployments> {
  static hidden = false;
  static description = 'Show list of deployments for an environment';

  static examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> -d "current working directory"',
    '$ <%= config.bin %> <%= command.id %> -c "path to the local config file"',
    '$ <%= config.bin %> <%= command.id %> -e "environment number or uid" --org=<org UID> --project=<Project UID>',
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

    if (!this.flags.environment) {
      await this.getConfig();
    }

    await this.prepareApiClients();

    if (!this.sharedConfig.currentConfig?.uid) {
      await this.selectOrg();
      await this.selectProject();
    }

    await this.showDeployments();
  }

  /**
   * @method showDeployments
   *
   * @memberof Deployments
   */
  async showDeployments() {
    const environments = await this.getEnvironments();

    ux.table(environments, {
      environment: {
        minWidth: 7,
      },
      deploymentUrl: {
        minWidth: 7,
        header: 'Deployment Url',
      },
      commitMessage: {
        minWidth: 7,
        header: 'Commit Message',
      },
      createdAt: {
        minWidth: 7,
        header: 'Created At',
      },
    });
  }

  /**
   * @method selectOrg - select organization
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async selectOrg(): Promise<void> {
    const organizations =
      (await this.managementSdk
        ?.organization()
        .fetchAll()
        .then(({ items }) => map(items, ({ uid, name }) => ({ name, value: name, uid })))
        .catch((error) => {
          this.log('Unable to fetch organizations.', 'warn');
          this.log(error, 'error');
          process.exit(1);
        })) || [];

    if (this.flags.org || this.sharedConfig.currentConfig.organizationUid) {
      this.sharedConfig.currentConfig.organizationUid =
        find(organizations, { uid: this.flags.org })?.uid ||
        find(organizations, {
          uid: this.sharedConfig.currentConfig.organizationUid,
        })?.uid;

      if (!this.sharedConfig.currentConfig.organizationUid) {
        this.log('Organization UID not found!', 'warn');
      }
    }

    if (!this.sharedConfig.currentConfig.organizationUid) {
      this.sharedConfig.currentConfig.organizationUid = await ux
        .inquire({
          type: 'search-list',
          name: 'Organization',
          choices: organizations,
          message: 'Choose an organization',
        })
        .then((name) => (find(organizations, { name }) as Record<string, any>)?.uid);
    }
    await this.prepareApiClients();
  }

  /**
   * @method selectProject - select projects
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async selectProject(): Promise<void> {
    const projects = await this.apolloClient
      .query({ query: projectsQuery, variables: { query: {} } })
      .then(({ data: { projects } }) => projects)
      .catch((error) => {
        this.log('Unable to fetch projects.!', { color: 'yellow' });
        this.log(error, 'error');
        process.exit(1);
      });

    const listOfProjects = map(projects.edges, ({ node: { uid, name } }) => ({
      name,
      value: name,
      uid,
    }));

    if (isEmpty(listOfProjects)) {
      this.log('Project not found', 'info');
      this.exit(1);
    }

    if (this.flags.project || this.sharedConfig.currentConfig.uid) {
      this.sharedConfig.currentConfig.uid =
        find(listOfProjects, {
          name: this.flags.project,
        })?.uid ||
        find(listOfProjects, {
          uid: this.sharedConfig.currentConfig.uid,
        })?.uid;
    }

    if (!this.sharedConfig.currentConfig.uid) {
      this.sharedConfig.currentConfig.uid = await ux
        .inquire({
          type: 'search-list',
          name: 'Project',
          choices: listOfProjects,
          message: 'Choose a project',
        })
        .then((name) => (find(listOfProjects, { name }) as Record<string, any>)?.uid);
    }
    await this.prepareApiClients();
  }

  /**
   * @method validateAndSelectEnvironment - check whether environment is validate or not. If not then option to select environment
   *
   * @return {*}  {Promise<void>}
   * @memberof Logs
   */
  async getEnvironments(): Promise<any> {
    const environments = await this.apolloClient
      .query({ query: environmentsQuery })
      .then(({ data: { Environments } }) => map(Environments.edges, 'node'))
      .catch((error) => {
        this.log(error?.message, 'error');
        process.exit(1);
      });
    let environment = find(
      environments,
      ({ uid, name }) =>
        uid === this.flags.environment ||
        name === this.flags.environment ||
        uid === this.sharedConfig.currentConfig?.environments?.[0]?.uid,
    );

    if (isEmpty(environment) && (this.flags.environment || this.sharedConfig.currentConfig?.environments?.[0]?.uid)) {
      this.log('Environment(s) not found!', 'error');
      process.exit(1);
    } else if (isEmpty(environment)) {
      environment = await ux
        .inquire({
          type: 'search-list',
          name: 'Environment',
          choices: map(environments, (row) => ({ ...row, value: row.name })),
          message: 'Choose an environment',
        })
        .then((name: any) => find(environments, { name }) as Record<string, any>);
      this.sharedConfig.currentConfig.deployments = map(environments[0]?.deployments?.edges, 'node');
    }

    this.sharedConfig.environment = environment;

    return map(environment.deployments.edges, ({ node }) => {
      const { deploymentUrl: url, createdAt, commitMessage } = node;
      const deploymentUrl = chalk.cyan(url?.startsWith('https') ? url : `https://${url}`);
      return {
        deploymentUrl,
        createdAt: chalk.green(createdAt),
        commitMessage: chalk.green(commitMessage),
        environment: chalk.green(environment.name),
      };
    });
  }
}
