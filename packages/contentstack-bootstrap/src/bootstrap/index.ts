import cli from 'cli-ux'
import { default as ContentStackSeed } from '@contentstack/cli-cm-seed/lib/commands/cm/seed'
import { AppConfig } from '../config'
import GitHubClient, { Repo } from './github/client'
import GithubError from './github/error'

const DEFAULT_OWNER = 'contentstack'
export const ENGLISH_LOCALE = 'en-us'

export interface BootstrapOptions {
  cloneDirectory: string;
  appConfig: AppConfig;
}

export default class Bootstrap {
  private readonly ghClient: GitHubClient;

  private ghUsername: string = DEFAULT_OWNER;

  private repo: Repo;

  private appConfig: AppConfig;

  private cloneDirectory: string;

  constructor(public options: BootstrapOptions
  ) {
    this.appConfig = options.appConfig
    this.cloneDirectory = options.cloneDirectory
    this.repo = GitHubClient.parsePath(options.appConfig.source)
    this.ghClient = new GitHubClient(this.repo)
  }

  async run() {
    // clone the repo
    // seed plugin run
    // env creation
    // load the app
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
      await ContentStackSeed.run(['-r', this.appConfig.stack])
    } catch (error) {
      cli.error(`Unable to create stack for content '${this.appConfig.stack}'.`)
    }
  }
}
