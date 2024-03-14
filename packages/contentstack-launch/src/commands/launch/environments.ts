import chalk from 'chalk';
import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { FlagInput, Flags, cliux as ux } from '@contentstack/cli-utilities';

import { BaseCommand } from '../../base-command';
import { Logger, selectOrg, selectProject } from '../../util';
import { environmentsQuery, projectsQuery } from '../../graphql';

export default class Environments extends BaseCommand<typeof Environments> {
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

    await this.getEnvironments();
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
          uid: this.flags.project,
        })?.uid ||
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
