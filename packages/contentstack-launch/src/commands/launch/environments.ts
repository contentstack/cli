import chalk from 'chalk';
import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { FlagInput, Flags, cliux as ux } from '@contentstack/cli-utilities';

import { Logger } from '../../util';
import { BaseCommand } from './base-command';
import { environmentsQuery, projectsQuery } from '../../graphql';

export default class Environments extends BaseCommand<typeof Environments> {
  static hidden = false;
  static description = 'Show list of environments for a project';

  static examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> -d "current working directory"',
    '$ <%= config.bin %> <%= command.id %> -c "path to the local config file"',
    '$ <%= config.bin %> <%= command.id %> --org=<org UID> --project=<Project UID>',
  ];

  static flags: FlagInput = {
    org: Flags.string({
      description: '[Optional] Provide the organization UID',
    }),
    project: Flags.string({
      description: '[Optional] Provide the project UID',
    }),
    branch: Flags.string({
      hidden: true,
      description: '[Optional] GitHub branch name',
    }),
  };

  async run(): Promise<void> {
    this.logger = new Logger(this.sharedConfig);
    this.log = this.logger.log.bind(this.logger);

    await this.getConfig();
    await this.prepareApiClients();

    if (!this.sharedConfig.currentConfig?.uid) {
      await this.selectOrg();
      await this.selectProject();
    }

    await this.getEnvironments();
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

    ux.table(
      map(environments, ({ uid, name, frameworkPreset }) => {
        return {
          uid: chalk.green(uid),
          name: chalk.green(name),
          frameworkPreset: chalk.green(
            find(this.sharedConfig.listOfFrameWorks, {
              value: frameworkPreset,
            })?.name || '',
          ),
        };
      }),
      {
        uid: {
          minWidth: 7,
          header: 'UID',
        },
        name: {
          minWidth: 7,
          header: 'Name',
        },
        frameworkPreset: {
          minWidth: 7,
          header: 'Framework',
        },
      },
    );
  }
}
