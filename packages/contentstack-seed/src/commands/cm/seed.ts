import {Command, flags} from '@contentstack/cli-command'
import ContentModelSeeder, {ContentModelSeederOptions} from '../../seed'

export default class SeedCommand extends Command {
  static description = 'Create a Stack from existing content types, entries, assets, etc';

  static examples = [
    '$ csdx cm:seed',
    '$ csdx cm:seed -r "account"',
    '$ csdx cm:seed -r "account/repository"',
    '$ csdx cm:seed -r "account/repository" -s "stack-uid" //seed content into specific stack',
    '$ csdx cm:seed -r "account/repository" -o "your-org-uid" -n "stack-name" //create a new stack in given org uid',
  ];

  static flags = {
    repo: flags.string({
      char: 'r',
      description: 'GitHub account or GitHub account/repository',
      multiple: false,
      required: false,
    }),
    org: flags.string({
      char: 'o',
      description: 'Provide Organization UID to create a new stack',
      multiple: false,
      required: false,
      exclusive: ['stack'],
    }),
    stack: flags.string({
      char: 's',
      description: 'Provide stack UID to seed content to',
      multiple: false,
      required: false,
      exclusive: ['org', 'name'],
    }),
    'stack-name': flags.string({
      char: 'n',
      description: 'Name of a new stack that needs to be created.',
      multiple: false,
      required: false,
      exclusive: ['stack'],
    }),
    'fetch-limit': flags.string({
      char: 'l',
      description: 'Limit for number of Organizations or stacks to be fetched',
      multiple: false,
      required: false,
      hidden: true,
    }),
  };

  async run() {
    try {
      const { flags: seedFlags } = this.parse(SeedCommand);

      if (!this.authToken) {
        this.error("You need to login, first. See: auth:login --help", {
          exit: 2,
          suggestions: [
            "https://www.contentstack.com/docs/developers/cli/authentication/",
          ],
        });
      }

      const options: ContentModelSeederOptions = {
        cdaHost: this.cdaHost,
        cmaHost: this.cmaHost,
        authToken: this.authToken,
        gitHubPath: seedFlags.repo,
        orgUid: seedFlags.org,
        stackUid: seedFlags.stack,
        stackName: seedFlags["stack-name"],
        fetchLimit: seedFlags["fetch-limit"],
      };

      const seeder = new ContentModelSeeder(options);
      const result = await seeder.run();
      return result;
    } catch (error: any) {
      this.error(error, { exit: 1, suggestions: error.suggestions });
    }
  }
}
