/* eslint-disable no-console */ /* eslint-disable node/no-extraneous-require */

import {Command, flags} from '@contentstack/cli-command'

export default class EntriesCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly log: Function;
  managementAPIClient: object;

  static description = `Publish entries from multiple content-types to multiple environments and locales
  The entries command is used for publishing entries from the specified content types, to the
  specified environments and locales 

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required
  `

  static examples = [
    'General Usage',
    'csdx cm:bulk-publish:entries -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
    '',
    'Using --config or -c flag',
    'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
    'csdx cm:bulk-publish:entries --config [PATH TO CONFIG FILE]',
    'csdx cm:bulk-publish:entries -c [PATH TO CONFIG FILE]',
    '',
    'Using --retryFailed or -r flag',
    'csdx cm:bulk-publish:entries --retryFailed [LOG FILE NAME]',
    'csdx cm:bulk-publish:entries -r [LOG FILE NAME]'
  ]

  static flags = {
    alias: flags.string({
      char: 'a', 
      description: 'Alias for the management token to be used'
    }),
    retryFailed: flags.string({
      char: 'r', 
      description: 'Retry failed entries from the logfile (optional, overrides all other flags) This flag is used to retry publishing entries that failed to publish in a previous attempt. A log file for the previous session will be required for processing the failed entries'
    }),
    bulkPublish: flags.string({
      char: 'b', 
      description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true'
    }),
    publishAllContentTypes: flags.boolean({char: 'o', description: 'Publish all content-types (optional, cannot be set when contentTypes flag is set)'}),
    contentTypes: flags.string({char: 't', description: 'The Content-types from which entries need to be published', multiple: true}),
    locales: flags.string({char: 'l', description: 'Locales to which entries need to be published', multiple: true }),
    environments: flags.string({char: 'e', description: 'Environments to which entries need to be published', multiple: true}),
    config: flags.string({char: 'c', description: 'Path for the external config file to be used (A new config file can be generated at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`)'}),
    yes: flags.boolean({char: 'y', description: 'Agree to process the command with the current configuration'}),
  }

  run(): void {
    this.log('from export') 
  }
}
