'use strict';
const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, flags } = require('@contentstack/cli-utilities');
const { publishOnlyUnpublishedService } = require('../../../services/publish-only-unpublished');

class PublishOnlyUnpublished extends Command {
  async run() {
    try {
      await publishOnlyUnpublishedService.apply(this, [PublishOnlyUnpublished]);
    } catch (error) {
      this.error(error.message || error, { exit: 2 });
    }
  }
}

PublishOnlyUnpublished.description = `Publish unpublished entries from the source environment, to other environments and locales
The publish-only-unpublished command is used to publish unpublished entries from the source environment, to other environments and locales

Note: Content type(s), Source Environment, Destination Environment(s) and Source Locale are required to execute the command successfully
But, if retry-failed flag is set, then only a logfile is required
`;

PublishOnlyUnpublished.flags = {
  alias: flags.string({ char: 'a', description: 'Alias (name) of the management token. You must use either the --alias flag or the --stack-api-key flag.' }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
  }),
  retryFailed: flags.string({
    char: 'r',
    hidden: true,
    description: '(optional) Use this option to retry publishing the failed entries from the logfile. It is optional. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
    parse: printFlagDeprecation(['--retryFailed', '-r'], ['--retry-failed']),
  }),
  'retry-failed': flags.string({
    description: '(optional) Use this option to retry publishing the failed entries from the logfile. It is optional. Specify the name of the logfile that lists failed publish calls. If this option is used, it will override all other flags.',
  }),
  bulkPublish: flags.string({
    char: 'b',
    hidden: true,
    description:
      "Set this flag to use Contentstack\'s Bulk Publish APIs. It is true, by default.",
    default: 'true',
    parse: printFlagDeprecation(['--bulkPublish', '-b'], ['--bulk-publish']),
  }),
  'bulk-publish': flags.string({
    char: 'b',
    description:
      "Set this flag to use Contentstack\'s Bulk Publish APIs. It is true, by default.",
    default: 'true',
  }),
  'api-version': flags.string({
    description : "API version to be used. Values [Default: 3, Nested Reference Publishing: 3.2]..",
  }),
  sourceEnv: flags.string({
    char: 's',
    hidden: true,
    description: 'The name of the source environment where the entries were initially published.',
    parse: printFlagDeprecation(['--sourceEnv', '-s'], ['--source-env']),
  }),
  'source-env': flags.string({
    description: 'The name of the source environment where the entries were initially published.',
  }),
  contentTypes: flags.string({
    char: 't',
    description: 'The UID of the content type(s) whose entries you want to publish in bulk. In case of multiple content types, specify their IDs separated by spaces.',
    multiple: true,
    hidden: true,
    parse: printFlagDeprecation(['--contentTypes', '-t'], ['--content-types']),
  }),
  'content-types': flags.string({
    description: 'The UID of the content type(s) whose entries you want to publish in bulk. In case of multiple content types, specify their IDs separated by spaces.',
    multiple: true,
  }),
  locale: flags.string({
    hidden: true,
    char: 'l',
    description: 'Locale in which entries will be published, e.g., en-us',
    parse: printFlagDeprecation(['-l'], ['--locales']),
  }),
  locales: flags.string({
    description: 'Locale in which entries will be published, e.g., en-us',
  }),
  environments: flags.string({ char: 'e', description: 'The name of the environment on which entries will be published. In case of multiple environments, specify their names separated by spaces.', multiple: true }),
  config: flags.string({ char: 'c', description: '(optional)  The path of the optional configuration JSON file containing all the options for a single run. Refer to the configure command to create a configuration file.' }),
  yes: flags.boolean({ char: 'y', description: 'Set it to true to process the command with the current configuration.' }),
  branch: flags.string({
    char: 'B',
    default: 'main',
    description: 'The name of the branch where you want to perform the bulk publish operation. If you don\'t mention the branch name, then by default the entries from main branch will be published.',
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
  '',
  'Using --stack-api-key',
  'csdx cm:entries:publish-only-unpublished -b --content-types [CONTENT TYPES] -e [ENVIRONMENTS] --locales LOCALE -a [MANAGEMENT TOKEN ALIAS] --stack-api-key [STACK API KEY] -source-env [SOURCE ENV]',
];

PublishOnlyUnpublished.aliases = ['cm:bulk-publish:unpublished-entries'];

PublishOnlyUnpublished.usage = 'cm:entries:publish-only-unpublished [-a <value>] [--retry-failed <value>] [--bulk-publish <value>] [--source-env <value>] [--content-types <value>] [--locales <value>] [-e <value>] [-c <value>] [-y] [--branch <value>]';

module.exports = PublishOnlyUnpublished;