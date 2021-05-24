import cli from 'cli-ux'
import * as tmp from 'tmp'
import * as importer from '../seed/importer'
import ContentstackClient, { Organization } from '../seed/contentstack/client'
import { inquireOrganization, inquireProceed, inquireRepo, inquireStack } from '../seed/interactive'
import GitHubClient from './github/client'
import GithubError from './github/error'

const DEFAULT_OWNER = 'contentstack'
const DEFAULT_STACK_PATTERN = 'stack-'

export const ENGLISH_LOCALE = 'en-us'

export interface ContentModelSeederOptions {
  cdaHost: string;
  cmaHost: string;
  authToken: string;
  gitHubPath: string | undefined;
}

export default class ContentModelSeeder {
  private readonly csClient: ContentstackClient;

  private readonly ghClient: GitHubClient;

  private ghUsername: string = DEFAULT_OWNER;

  private ghRepo: string | undefined;

  get ghPath(): string {
    return `${this.ghUsername}/${this.ghRepo}`
  }

  constructor(public options: ContentModelSeederOptions
  ) {
    const gh = GitHubClient.parsePath(options.gitHubPath)
    this.ghUsername = gh.username || DEFAULT_OWNER
    this.ghRepo = gh.repo

    this.csClient = new ContentstackClient(options.cmaHost, options.authToken)
    this.ghClient = new GitHubClient(this.ghUsername, DEFAULT_STACK_PATTERN)
  }

  async run() {
    let api_key: string

    const { organizationResponse, stackResponse } = await this.getInput()

    if (stackResponse.isNew && stackResponse.name) {
      api_key = await this.createStack(organizationResponse, stackResponse.name)
    } else {
      api_key = stackResponse.api_key as string

      const proceed = await this.shouldProceed(api_key)

      if (!proceed) {
        cli.log('Exiting. Please re-run the command, if you wish to seed content.')
        return
      }
    }

    const tmpPath = await this.downloadRelease() as string

    cli.log(
      `Importing into '${stackResponse.name}'.`
    )

    await importer.run({
      api_key: api_key,
      authToken: this.options.authToken,
      cdaHost: this.options.cdaHost,
      cmaHost: this.options.cmaHost,
      master_locale: ENGLISH_LOCALE,
      tmpPath: tmpPath,
    })
    return { api_key }
  }

  async getInput() {
    const organizations = await this.csClient.getOrganizations()

    if (!organizations || organizations.length === 0) {
      throw new Error(
        'You do not have access to any organizations. Please try again or ask an Administrator for assistance.'
      )
    }

    if (!this.ghRepo) {
      await this.inquireGitHubRepo()
    }

    const repoExists = await this.ghClient.checkIfRepoExists((this.ghRepo as string))

    if (repoExists === false) {
      cli.error(`Could not find GitHub repository '${this.ghPath}'.`)
    } else {
      const organizationResponse = await inquireOrganization(organizations)
      const stacks = await this.csClient.getStacks(organizationResponse.uid)
      const stackResponse = await inquireStack(stacks)

      return { organizationResponse, stackResponse }
    }
  }

  async createStack(organization: Organization, stackName: string) {
    cli.action.start(
      `Creating Stack '${stackName}' within Organization '${organization.name}'`
    )

    const newStack = await this.csClient.createStack({
      name: stackName,
      description: '',
      master_locale: ENGLISH_LOCALE,
      org_uid: organization.uid,
    })

    cli.action.stop()

    return newStack.api_key
  }

  async shouldProceed(api_key: string) {
    const count = await this.csClient.getContentTypeCount(api_key)

    if (count > 0) {
      const proceed = await inquireProceed()

      if (!proceed) {
        return false
      }
    }

    return true
  }

  async downloadRelease() {
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    })

    cli.debug(`Creating temporary directory '${tmpDir.name}'.`)
    cli.action.start('Downloading and extracting Stack')

    try {
      await this.ghClient.getLatest(this.ghRepo as string, tmpDir.name)
    } catch (error) {
      if (error instanceof GithubError) {
        if (error.status === 404) {
          cli.error(`Unable to find a release for '${this.ghPath}'.`)
        }
      }
    } finally {
      cli.action.stop()
    }

    return tmpDir.name
  }

  async inquireGitHubRepo() {
    try {
      const allRepos = await this.ghClient.getAllRepos()
      const stackRepos = allRepos.filter((repo: any) => repo.name.startsWith(DEFAULT_STACK_PATTERN))
      const repoResponse = await inquireRepo(stackRepos)
      this.ghRepo = repoResponse.choice
    } catch (error) {
      cli.error(`Unable to find any Stack repositories within the '${this.ghUsername}' GitHub account. Please re-run this command with a GitHub repository in the 'account/repo' format. You can also re-run the command without arguments to pull from the official Stack list.`)
    }
  }
}
