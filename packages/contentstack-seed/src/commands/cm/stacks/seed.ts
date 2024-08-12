import { Command } from '@contentstack/cli-command';
import {
  printFlagDeprecation,
  flags,
  isAuthenticated,
  FlagInput,
  cliux,
  configHandler,
} from '@contentstack/cli-utilities';
import ContentModelSeeder, { ContentModelSeederOptions } from '../../../seed';

export default class SeedCommand extends Command {
  static description = 'Create a stack from existing content types, entries, assets, etc';

  static examples = [
    '$ csdx cm:stacks:seed',
    '$ csdx cm:stacks:seed --repo "account"',
    '$ csdx cm:stacks:seed --repo "account/repository"',
    '$ csdx cm:stacks:seed --repo "account/repository" --stack-api-key "stack-api-key" //seed content into specific stack',
    '$ csdx cm:stacks:seed --repo "account/repository" --org "your-org-uid" --stack-name "stack-name" //create a new stack in given org uid',
  ];

  static usage = 'cm:stacks:seed [--repo <value>] [--org <value>] [-k <value>] [-n <value>] [-y <value>] [-s <value>] [--locale <value>]';

  static flags: FlagInput = {
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
    alias: flags.string({
      char: 'a',
      description: 'Alias of the management token',
    }),
    locale: flags.string({
      description: 'Master Locale of the stack',
      hidden: true,
    }),
  };

  static aliases = ['cm:seed'];

  async run() {
    try {
      const { flags: seedFlags } = await this.parse(SeedCommand);
      const managementTokenAlias = seedFlags.alias;

      if (!isAuthenticated() && !managementTokenAlias) {
        this.error('You need to login or provide an alias for the management token. See: auth:login --help', {
          exit: 2,
          suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
        });
      }
      const options: ContentModelSeederOptions = {
        parent: this,
        cdaHost: this.cdaHost,
        cmaHost: this.cmaHost,
        gitHubPath: seedFlags.repo,
        orgUid: seedFlags.org,
        stackUid: seedFlags['stack-api-key'] || seedFlags.stack,
        stackName: seedFlags['stack-name'],
        fetchLimit: seedFlags['fetch-limit'],
        skipStackConfirmation: seedFlags['yes'],
        isAuthenticated: isAuthenticated(),
        alias: managementTokenAlias,
        master_locale: seedFlags['locale'],
      };

      const listOfTokens = configHandler.get('tokens');

      if (managementTokenAlias && listOfTokens[managementTokenAlias]) {
        options.managementToken = listOfTokens[managementTokenAlias].token;
        options.stackUid = listOfTokens[managementTokenAlias].apiKey;
      }

      const seeder = new ContentModelSeeder(options);
      const result = await seeder.run();
      return result;
    } catch (error) {
      let errorObj: any = error;
      if (errorObj.message !== undefined) {
        cliux.loader();
        cliux.print(`Error: ${errorObj.message}`, { color: 'red' });
        this.exit(1);
      }
      this.error(errorObj, { exit: 1, suggestions: errorObj.suggestions });
    }
  }
}