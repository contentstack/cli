import {Command, flags} from '@contentstack/cli-command'
import ContentModelSeeder, {ContentModelSeederOptions} from '../../seed'

export default class SeedCommand extends Command {
  static description = 'Create a Stack from existing content types, entries, assets, etc';

  static examples = [
    '$ csdx cm:seed',
    '$ csdx cm:seed -r "account"',
    '$ csdx cm:seed -r "account/repository"',
  ];

  static flags = {
    repo: flags.string({
      char: 'r',
      description: 'GitHub account or GitHub account/repository',
      multiple: false,
      required: false,
    }),
  };

  async run() {
    try {
      const {flags} = this.parse(SeedCommand)

      if (!this.authToken) {
        this.error('You need to login, first. See: auth:login --help', {exit: 2, suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/']})
      }

      const options: ContentModelSeederOptions = {
        cdaHost: this.cdaHost,
        cmaHost: this.cmaHost,
        authToken: this.authToken,
        gitHubPath: flags.repo,
      }

      const seeder = new ContentModelSeeder(options)
      await seeder.run()
    } catch (error) {
      this.error(error, {exit: 1, suggestions: error.suggestions})
    }
  }
}
