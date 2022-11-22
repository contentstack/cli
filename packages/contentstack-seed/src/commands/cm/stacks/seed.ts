import { Command, flags } from '@contentstack/cli-command';
import ContentModelSeeder, { ContentModelSeederOptions } from '../../../seed';
import { printFlagDeprecation } from '@contentstack/cli-utilities';

export default class SeedCommand extends Command {
  static description = 'Create a stack from existing content types, entries, assets, etc';

  static examples = [
    '$ csdx cm:stacks:seed',
    '$ csdx cm:stacks:seed --repo "account"',
    '$ csdx cm:stacks:seed --repo "account/repository"',
    '$ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack',
    '$ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack in given org uid',
  ];

  static usage = 'cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>]';

  static flags = {
    repo: flags.string({
      char: 'r',
      description: 'GitHub account or GitHub account/repository',
      multiple: false,
      required: false,
      parse: printFlagDeprecation(['-r'], ['--repo']),
    }),
    org: flags.string({
      char: 'o',
      description: 'Provide Organization UID to create a new stack',
      multiple: false,
      required: false,
      exclusive: ['stack'],
      parse: printFlagDeprecation(['-o'], ['--org']),
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'Provide stack api key to seed content to',
      multiple: false,
      required: false,
      exclusive: ['org'],
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
    yes: flags.string({
      char: 'y',
      required: false,
      description: '[Optional] Skip stack confirmation',
    }),

    //To be deprecated
    stack: flags.string({
      char: 's',
      description: 'Provide stack UID to seed content to',
      multiple: false,
      required: false,
      exclusive: ['org', 'name'],
      parse: printFlagDeprecation(['s', 'stack'], ['-k', 'stack-api-key']),
    }),
  };

  static aliases = ['cm:seed'];

  async run() {
    try {
      const { flags: seedFlags } = this.parse(SeedCommand);

      if (!this.authToken) {
        this.error('You need to login, first. See: auth:login --help', {
          exit: 2,
          suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
        });
      }

      const options: ContentModelSeederOptions = {
        cdaHost: this.cdaHost,
        cmaHost: this.cmaHost,
        authToken: this.authToken,
        gitHubPath: seedFlags.repo,
        orgUid: seedFlags.org,
        stackUid: seedFlags['stack-api-key'] || seedFlags.stack,
        stackName: seedFlags['stack-name'],
        fetchLimit: seedFlags['fetch-limit'],
        skipStackConfirmation: seedFlags['yes'],
      };

      const seeder = new ContentModelSeeder(options);
      const result = await seeder.run();
      return result;
    } catch (error) {
      let errorObj: any = error;
      this.error(errorObj, { exit: 1, suggestions: errorObj.suggestions });
    }
  }
}
