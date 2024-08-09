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
  parent?: any;
  cdaHost: string;
  cmaHost: string;
  gitHubPath: string | undefined;
  orgUid: string | undefined;
  stackUid: string | undefined;
  stackName: string | undefined;
  fetchLimit: string | undefined;
  skipStackConfirmation: string | undefined;
  isAuthenticated: boolean | false;
  managementToken?: string | undefined;
  alias?: string | undefined;
  master_locale?: string | undefined;
}

export default class ContentModelSeeder {
  private readonly parent: any = null;
  private readonly csClient: ContentstackClient;

  private readonly ghClient: GitHubClient;

  private readonly _options: ContentModelSeederOptions;

  private ghUsername: string = DEFAULT_OWNER;

  private ghRepo: string | undefined;
  managementToken?: string | undefined;

  get ghPath(): string {
    return `${this.ghUsername}/${this.ghRepo}`;
  }

  constructor(public options: ContentModelSeederOptions) {
    this.parent = options.parent || null;
    this._options = options;
    const gh = GitHubClient.parsePath(options.gitHubPath);
    this.ghUsername = gh.username || DEFAULT_OWNER;
    this.ghRepo = gh.repo;
    const limit = Number(this.options.fetchLimit);
    this.managementToken = options.managementToken;

    this.csClient = new ContentstackClient(options.cmaHost, limit);
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

    cliux.print(`Importing into ${this.managementToken ? 'your stack' : `'${stackResponse.name}'`}.`);
    

    await importer.run({
      api_key: api_key,
      cdaHost: this.options.cdaHost,
      cmaHost: this.options.cmaHost,
      master_locale : this.options.master_locale || ENGLISH_LOCALE,
      tmpPath: tmpPath,
      isAuthenticated: this.options.isAuthenticated,
      alias: this.options.alias,
    });
    return { api_key };
  }

  async getInput(): Promise<
    | {
        organizationResponse: Organization;
        stackResponse: InquireStackResponse;
      }
    | any
  > {
    if (!this.ghRepo) {
      await this.inquireGitHubRepo();
    }

    let repoExists = false;
    let repoResponseData: any = {};
    try {
      const repoCheckResult = await this.ghClient.makeGetApiCall(this.ghRepo as string);
      repoExists = repoCheckResult.statusCode === 200;
      repoResponseData = { status: repoCheckResult.statusCode, statusMessage: repoCheckResult.statusMessage };
    } catch (error) {
      throw error;
    }

    if (repoExists === false) {
      cliux.error(
        repoResponseData.status === 403
          ? repoResponseData.statusMessage
          : `Could not find GitHub repository '${this.ghPath}'.`,
      );
      if (this.parent) this.parent.exit(1);
    } else {
      let organizationResponse: Organization | undefined;
      let stackResponse: InquireStackResponse;
      let stack: Stack;
      if (this.options.stackUid && this.options.managementToken) {
        stackResponse = {
          isNew: false,
          name: 'your stack',
          uid: this.options.stackUid,
          api_key: this.options.stackUid,
        };
      } else if (this.options.stackUid) {
        stack = await this.csClient.getStack(this.options.stackUid);
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

    const newStack = await this.csClient.createStack({
      name: stackName,
      description: '',
      master_locale: this.options.master_locale || ENGLISH_LOCALE,
      org_uid: organization.uid,
    });

    cliux.loader();

    return newStack.api_key;
  }

  async shouldProceed(api_key: string) {
    let count;
    const stack_details = await this.csClient.getStack(api_key);
    if(this.options.master_locale != stack_details.master_locale){
        cliux.print(`Compass app requires the master locale to be set to English (en).`,{
          color: "yellow",
          bold: true,
        });
        return false;
    }
    const managementBody = {
          "name":"Checking roles for creating management token",
          "description":"This is a compass app management token.",
          "scope":[
              {
                  "module":"content_type",
                  "acl":{
                      "read":true,
                      "write":true
                  }
              },
              {
                  "module":"branch",
                  "branches":[
                      "main"
                  ],
                  "acl":{
                      "read":true
                  }
              }
          ],
          "expires_on": "3000-01-01",
          "is_email_notification_enabled":false
      }
    let managementTokenResult = await this.csClient.createManagementToken(api_key, this.managementToken, managementBody);
    if(managementTokenResult?.response_code == "161" || managementTokenResult?.response_code == "401"){
      cliux.print(
        `Info: Failed to generate a management token.\nNote: Management token is not available in your plan. Please contact the admin for support.`,
        {
          color: 'red',
        },
      );
      return false;
    }    
    count = await this.csClient.getContentTypeCount(api_key, this.managementToken);

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