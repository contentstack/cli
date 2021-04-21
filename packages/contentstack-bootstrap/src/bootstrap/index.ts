import cli from 'cli-ux'
import * as path from 'path'
import { default as ContentStackSeed } from '@contentstack/cli-cm-seed/lib/commands/cm/seed'
import { AppConfig } from '../config'
import GitHubClient, { Repo } from './github/client'
import GithubError from './github/error'
import { setupEnvironments } from './utils'

const DEFAULT_OWNER = 'contentstack'
export const ENGLISH_LOCALE = 'en-us'

export interface BootstrapOptions {
  cloneDirectory: string;
  appConfig: AppConfig;
  managementAPIClient: any;
  region: any;
}

/**
 * @description Bootstraps the sample app
 * Clone the repo
 * Create the stack from the source
 * Setup the environment
 * Ready to use!!
 * 
 */
export default class Bootstrap {
  private readonly ghClient: GitHubClient;

  private ghUsername: string = DEFAULT_OWNER;

  private repo: Repo;

  private appConfig: AppConfig;

  private region: any;

  private managementAPIClient: any;

  private cloneDirectory: string;

  constructor(public options: BootstrapOptions
  ) {
    this.region = options.region
    this.appConfig = options.appConfig
    this.managementAPIClient = options.managementAPIClient
    this.repo = GitHubClient.parsePath(options.appConfig.source)
    this.cloneDirectory = path.join(options.cloneDirectory, this.repo.name)
    this.ghClient = new GitHubClient(this.repo)
  }

  async run(): Promise<any> {
    cli.action.start('Cloning the selected app')
    try {
      await this.ghClient.getLatest(this.cloneDirectory)
    } catch (error) {
      if (error instanceof GithubError) {
        if (error.status === 404) {
          cli.error(`Unable to find a repo for '${this.appConfig.source}'.`)
        }
      }
      throw error
    } finally {
      cli.action.stop()
    }

    // seed plugin start
    // TBD: using result values
    try {
      const result = await ContentStackSeed.run(['-r', this.appConfig.stack])
      if (result.api_key) {
        await setupEnvironments(
          this.managementAPIClient,
          result.api_key,
          this.appConfig,
          this.cloneDirectory,
          this.region,
        )
      } else {
        throw new Error('No API key generated for the stack')
      }
    } catch (error) {
      cli.error(`Unable to create stack for content '${this.appConfig.stack}' \n ${error.stack}`)
    }
  }
}
