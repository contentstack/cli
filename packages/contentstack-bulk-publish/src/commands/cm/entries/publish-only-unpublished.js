'use strict';

const { Command, flags } = require('@contentstack/cli-command');
const { printFlagDeprecation } = require('@contentstack/cli-utilities');
const { publishOnlyUnpublishedService } = require('../../../services/publish-only-unpublished');

class PublishOnlyUnpublished extends Command {
  async run() {
    try {
      await publishOnlyUnpublishedService.apply(this, [PublishOnlyUnpublished]);
    } catch (error) {
      this.error(error, { exit: 2 });
    }
  }
}

PublishOnlyUnpublished.description = `Publish unpublished entries from the source environment, to other environments and locales
The publish-only-unpublished command is used for publishing unpublished entries from the source environment, to other environments and locales

Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`;

PublishOnlyUnpublished.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({
    char: 'r',
    description: 'Retry publishing failed entries from the logfile',
    parse: printFlagDeprecation(['--retryFailed', '-r'], ['--retry-failed']),
  }),
  bulkPublish: flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
    parse: printFlagDeprecation(['--bulkPublish', '-b'], ['--bulk-publish']),
  }),
  sourceEnv: flags.string({
    char: 's',
    description: 'Source Env',
    parse: printFlagDeprecation(['--sourceEnv', '-s'], ['--source-env']),
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types from which entries need to be published',
    multiple: true,
    parse: printFlagDeprecation(['--contentTypes', '-t'], ['--content-type']),
  }),
  locale: flags.string({
    char: 'l',
    description: 'Source locale',
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
  config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
  yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'Specify the branch to fetch the content from (default is main branch)',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
};

PublishOnlyUnpublished.examples = [
  'General Usage',
  'csdx cm:entries:publish-only-unpublished -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -s [SOURCE ENV]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:entries:publish-only-unpublished --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:publish-only-unpublished -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:entries:publish-only-unpublished --retryFailed [LOG FILE NAME]',
  'csdx cm:entries:publish-only-unpublished -r [LOG FILE NAME]',
  '',
  'Using --branch or -B flag',
  'csdx cm:entries:publish-only-unpublished -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME] -s [SOURCE ENV]',
];

module.exports = PublishOnlyUnpublished;