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
But, if retry-failed flag is set, then only a logfile is required
`;

PublishOnlyUnpublished.flags = {
  alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
  retryFailed: flags.string({
    char: 'r',
    hidden: true,
    description: 'Retry publishing failed entries from the logfile',
    parse: printFlagDeprecation(['--retryFailed', '-r'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description: 'Retry publishing failed entries from the logfile',
    parse: printFlagDeprecation(['--retryFailed', '-r'], ['--retry-failed']),
  }),
  bulkPublish: flags.string({
    char: 'b',
    hidden: true,
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
    parse: printFlagDeprecation(['--bulkPublish', '-b'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    char: 'b',
    description:
      "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
    default: 'true',
  }),
  sourceEnv: flags.string({
    char: 's',
    hidden: true,
    description: 'Source Env',
    parse: printFlagDeprecation(['--sourceEnv', '-s'], ['--source-env']),
  }),
  'source-env': flags.string({
    description: 'Source Env',
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The Content-Types from which entries need to be published',
    multiple: true,
    hidden: true,
    parse: printFlagDeprecation(['--contentTypes', '-t'], ['--content-types']),
  }),
  'content-types': flags.string({
    description: 'The Content-Types from which entries need to be published',
    multiple: true,
  }),
  locale: flags.string({
    hidden: true,
    char: 'l',
    description: 'Source locale',
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  locales: flags.string({
    description: 'Source locale',
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
  'csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] -source-env [SOURCE ENV]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:entries:publish-only-unpublished --config [PATH TO CONFIG FILE]',
  'csdx cm:entries:publish-only-unpublished -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed',
  'csdx cm:entries:publish-only-unpublished --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch',
  'csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME] -source-env [SOURCE ENV]',
];

PublishOnlyUnpublished.aliases = ['cm:bulk-publish:unpublished-entries'];

module.exports = PublishOnlyUnpublished;