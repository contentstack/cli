import * as tmp from 'tmp';
import { cliux } from '@contentstack/cli-utilities';

import * as importer from '../seed/importer';
import ContentstackClient, { Organization, Stack } from '../seed/contentstack/client';
import {
  inquireOrganization,
  inquireProceed,
  inquireRepo,
  inquireStack,
  InquireStackResponse,
} from '../seed/interactive';
import GitHubClient from './github/client';
import GithubError from './github/error';

const DEFAULT_OWNER = 'contentstack';
const DEFAULT_STACK_PATTERN = 'stack-';

export const ENGLISH_LOCALE = 'en-us';

export interface ContentModelSeederOptions {
  cdaHost: string;
  cmaHost: string;
  authToken: string;
  gitHubPath: string | undefined;
  orgUid: string | undefined;
  stackUid: string | undefined;
  stackName: string | undefined;
  fetchLimit: string | undefined;
  skipStackConfirmation: string | undefined;
}

export default class ContentModelSeeder {
  private readonly csClient: ContentstackClient;

  private readonly ghClient: GitHubClient;

  private readonly _options: ContentModelSeederOptions;

  private ghUsername: string = DEFAULT_OWNER;

  private ghRepo: string | undefined;

  get ghPath(): string {
    return `${this.ghUsername}/${this.ghRepo}`;
  }

  constructor(public options: ContentModelSeederOptions) {
    this._options = options;
    const gh = GitHubClient.parsePath(options.gitHubPath);
    this.ghUsername = gh.username || DEFAULT_OWNER;
    this.ghRepo = gh.repo;
    const limit = Number(this.options.fetchLimit);

    this.csClient = new ContentstackClient(options.cmaHost, options.authToken, limit);
    this.ghClient = new GitHubClient(this.ghUsername, DEFAULT_STACK_PATTERN);
  }

  async run() {
    let api_key: string;
    const { organizationResponse, stackResponse } = await this.getInput();

    if (stackResponse.isNew && stackResponse.name) {
      api_key = await this.createStack(organizationResponse, stackResponse.name);
    } else {
      api_key = stackResponse.api_key as string;

      const proceed = await this.shouldProceed(api_key);

      if (!proceed) {
        cliux.print('Exiting. Please re-run the command, if you wish to seed content.');
        return;
      }
    }

    const tmpPath = await this.downloadRelease();

    cliux.print(`Importing into '${stackResponse.name}'.`);

    await importer.run({
      api_key: api_key,
      authToken: this.options.authToken,
      cdaHost: this.options.cdaHost,
      cmaHost: this.options.cmaHost,
      master_locale: ENGLISH_LOCALE,
      tmpPath: tmpPath,
    });
    return { api_key };
  }

  async getInput(): Promise<{
    organizationResponse: Organization,
    stackResponse: InquireStackResponse
  } | any> {
    if (!this.ghRepo) {
      await this.inquireGitHubRepo();
    }
    const repoExists = await this.ghClient.checkIfRepoExists(this.ghRepo as string);

    if (repoExists === false) {
      cliux.error(`Could not find GitHub repository '${this.ghPath}'.`);
    } else {
      let organizationResponse: Organization | undefined;
      let stackResponse: InquireStackResponse;

      if (this.options.stackUid) {
        const stack: Stack = await this.csClient.getStack(this.options.stackUid);
        stackResponse = {
          isNew: false,
          name: stack.name,
          uid: stack.uid,
          api_key: stack.api_key,
        };
      } else {
        if (this.options.orgUid) {
          organizationResponse = await this.csClient.getOrganization(this.options.orgUid);
        } else {
          const organizations = await this.csClient.getOrganizations();
          if (!organizations || organizations.length === 0) {
            throw new Error(
              'You do not have access to any organizations. Please try again or ask an Administrator for assistance.',
            );
          }
          organizationResponse = await inquireOrganization(organizations);
        }
        const stacks = await this.csClient.getStacks(organizationResponse.uid);
        stackResponse = await inquireStack(stacks, this.options.stackName);
      }

      return { organizationResponse, stackResponse };
    }
  }

  async createStack(organization: Organization, stackName: string) {
    cliux.loader(`Creating Stack '${stackName}' within Organization '${organization.name}'`);
    this.options.fetchLimit;

    const newStack = await this.csClient.createStack({
      name: stackName,
      description: '',
      master_locale: ENGLISH_LOCALE,
      org_uid: organization.uid,
    });

    cliux.loader();

    return newStack.api_key;
  }

  async shouldProceed(api_key: string) {
    const count = await this.csClient.getContentTypeCount(api_key);

    if (count > 0 && this._options.skipStackConfirmation !== 'yes') {
      const proceed = await inquireProceed();

      if (!proceed) {
        return false;
      }
    }

    return true;
  }

  async downloadRelease() {
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    });

    cliux.print(`Creating temporary directory '${tmpDir.name}'.`);
    cliux.loader('Downloading and extracting Stack');

    try {
      await this.ghClient.getLatest(this.ghRepo as string, tmpDir.name);
    } catch (error) {
      if (error instanceof GithubError) {
        if (error.status === 404) {
          cliux.error(`Unable to find a release for '${this.ghPath}'.`);
        }
      }
    } finally {
      cliux.loader();
    }

    return tmpDir.name;
  }

  async inquireGitHubRepo() {
    try {
      const allRepos = await this.ghClient.getAllRepos();
      const stackRepos = allRepos.filter((repo: any) => repo.name.startsWith(DEFAULT_STACK_PATTERN));
      const repoResponse = await inquireRepo(stackRepos);
      this.ghRepo = repoResponse.choice;
    } catch (error) {
      cliux.error(
        `Unable to find any Stack repositories within the '${this.ghUsername}' GitHub account. Please re-run this command with a GitHub repository in the 'account/repo' format. You can also re-run the command without arguments to pull from the official Stack list.`,
      );
    }
  }
}
