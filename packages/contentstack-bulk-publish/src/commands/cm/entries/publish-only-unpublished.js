'use strict';

const UnpublishedEntriesCommand = require('../bulk-publish/unpublished-entries');

class PublishOnlyUnpublished extends UnpublishedEntriesCommand {}

// PublishOnlyUnpublished.description = `Publish unpublished entries from the source environment, to other environments and locales
// The unpublished-entries command is used for publishing unpublished entries from the source environment, to other environments and locales

// Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the command successfully
// But, if retryFailed flag is set, then only a logfile is required
// `;

// PublishOnlyUnpublished.flags = {
//   alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
//   retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
//   bulkPublish: flags.string({
//     char: 'b',
//     description:
//       "This flag is set to true by default. It indicates that contentstack's bulkpublish API will be used for publishing the entries",
//     default: 'true',
//   }),
//   sourceEnv: flags.string({ char: 's', description: 'Source Env' }),
//   contentTypes: flags.string({
//     char: 't',
//     description: 'The Content-Types from which entries need to be published',
//     multiple: true,
//   }),
//   locale: flags.string({ char: 'l', description: 'Source locale' }),
//   environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
//   config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
//   yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
//   branch: flags.string({
//     char: 'B',
//     default: 'main',
//     description: 'Specify the branch to fetch the content from (default is main branch)',
//   }),
// };

// PublishOnlyUnpublished.examples = [
//   'General Usage',
//   'csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -s [SOURCE ENV]',
//   '',
//   'Using --config or -c flag',
//   'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
//   'csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]',
//   'csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]',
//   '',
//   'Using --retryFailed or -r flag',
//   'csdx cm:bulk-publish:unpublished-entries --retryFailed [LOG FILE NAME]',
//   'csdx cm:bulk-publish:unpublished-entries -r [LOG FILE NAME]',
//   '',
//   'Using --branch or -B flag',
//   'csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS] -B [BRANCH NAME] -s [SOURCE ENV]',
// ];

module.exports = PublishOnlyUnpublished;