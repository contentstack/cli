import * as path from 'path';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';
import { default as ContentStackSeed } from '@contentstack/cli-cm-seed/lib/commands/cm/stacks/seed';

import { AppConfig } from '../config';
import messageHandler from '../messages';
import { setupEnvironments } from './utils';
import GithubError from './github/github-error';
import GitHubClient, { Repo } from './github/client';

export const ENGLISH_LOCALE = 'en-us';

export interface BootstrapOptions {
  cloneDirectory: string;
  seedParams: SeedParams;
  appConfig: AppConfig;
  managementAPIClient: any;
  region: any;
  accessToken?: string;
  appType: string;
  livePreviewEnabled?: boolean;
  master_locale: any;
}

export interface SeedParams {
  stackAPIKey?: string;
  org?: string;
  stackName?: string;
  yes?: string;
  managementTokenAlias?: string | undefined;
  managementToken?: string | undefined;
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
    this.cloneDirectory = path.join(sanitizePath(options.cloneDirectory), sanitizePath(this.repo.name));
    this.ghClient = new GitHubClient(this.repo, options.appConfig.private, options.accessToken);
    this.options = options;
  }

  async run(): Promise<any> {
    cliux.loader(messageHandler.parse('CLI_BOOTSTRAP_START_CLONE_APP'));

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
      const cmd = ['--repo', this.appConfig.stack];
      if (this.options.seedParams.stackAPIKey) {
        cmd.push('--stack-api-key', this.options.seedParams.stackAPIKey);
      }
      if (this.options.seedParams.org) {
        cmd.push('--org', this.options.seedParams.org);
      }
      if (this.options.seedParams.stackName) {
        cmd.push('-n', this.options.seedParams.stackName);
      }
      if (this.options.seedParams.yes) {
        cmd.push('-y', this.options.seedParams.yes);
      }
      if (this.options.seedParams.managementTokenAlias) {
        cmd.push('--alias', this.options.seedParams.managementTokenAlias);
      }
      if (this.options.master_locale) {
        cmd.push('--locale', this.options.master_locale);
      }

      const result = await ContentStackSeed.run(cmd);
      if (result && result.api_key) {
        await setupEnvironments(
          this.managementAPIClient,
          result.api_key,
          this.appConfig,
          this.cloneDirectory,
          this.region,
          this.options.livePreviewEnabled as boolean,
          this.options.seedParams.managementToken as string,
        );
      } else {
        throw new Error(messageHandler.parse('CLI_BOOTSTRAP_NO_API_KEY_FOUND'));
      }

      if (this.options.livePreviewEnabled) {
        cliux.print(
          'Note: Before running the app, please configure a preview token, preview host, and app host in the environment file',
          {
            color: 'yellow',
          },
        );
      }

      cliux.print(messageHandler.parse('CLI_BOOTSTRAP_SUCCESS'));
    } catch (error) {
      cliux.error(messageHandler.parse('CLI_BOOTSTRAP_STACK_CREATION_FAILED', this.appConfig.stack));
    }
  }
}