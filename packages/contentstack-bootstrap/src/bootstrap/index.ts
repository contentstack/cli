import * as path from 'path';
import { cliux } from '@contentstack/cli-utilities';
import { default as ContentStackSeed } from '@contentstack/cli-cm-seed/lib/commands/cm/stacks/seed';

import { AppConfig } from '../config';
import messageHandler from '../messages';
import { setupEnvironments } from './utils';
import GithubError from './github/github-error';
import GitHubClient, { Repo } from './github/client';

export const ENGLISH_LOCALE = 'en-us';

export interface BootstrapOptions {
  cloneDirectory: string;
  appConfig: AppConfig;
  managementAPIClient: any;
  region: any;
  accessToken: string;
  appType: string;
}

/**
 * @description Bootstraps the sample app
 * Clone the repo
 * Create the stack from the source
 * Setup the environment
 * Ready to use!!
 */
export default class Bootstrap {
  private readonly ghClient: GitHubClient;

  private repo: Repo;

  private appConfig: AppConfig;

  private region: any;

  private managementAPIClient: any;

  private cloneDirectory: string;

  constructor(public options: BootstrapOptions) {
    this.region = options.region;
    this.appConfig = options.appConfig;
    this.managementAPIClient = options.managementAPIClient;
    this.repo = GitHubClient.parsePath(options.appConfig.source);
    if (options.appConfig.branch) {
      this.repo.branch = options.appConfig.branch;
    }
    this.cloneDirectory = path.join(options.cloneDirectory, this.repo.name);
    this.ghClient = new GitHubClient(this.repo, options.appConfig.private, options.accessToken);
    this.options = options;
  }

  async run(): Promise<any> {
    cliux.loader(messageHandler.parse('CLI_BOOTSTRAP_START_CLONE_APP'))

    try {
      await this.ghClient.getLatest(this.cloneDirectory);
    } catch (error) {
      if (error instanceof GithubError) {
        if (error.status === 404) {
          cliux.error(messageHandler.parse('CLI_BOOTSTRAP_REPO_NOT_FOUND', this.appConfig.source));
        }
      }
      throw error;
    } finally {
      cliux.loader();
    }

    // seed plugin start
    try {
      const result = await ContentStackSeed.run(['-r', this.appConfig.stack]);
      if (result.api_key) {
        await setupEnvironments(
          this.managementAPIClient,
          result.api_key,
          this.appConfig,
          this.cloneDirectory,
          this.region,
        );
      } else {
        throw new Error(messageHandler.parse('CLI_BOOTSTRAP_NO_API_KEY_FOUND'));
      }
      cliux.print(messageHandler.parse('CLI_BOOTSTRAP_SUCCESS'))
    } catch (error) {
      cliux.error(messageHandler.parse('CLI_BOOTSTRAP_STACK_CREATION_FAILED', this.appConfig.stack))
    }
  }
}
