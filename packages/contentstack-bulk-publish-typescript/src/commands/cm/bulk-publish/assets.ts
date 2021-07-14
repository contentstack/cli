import {messageHandler} from '../../../utils'

const {Command, flags} = require('@oclif/command')
const {start} = require('../../../producer/publish-assets')
const store = require('../../../utils/store.js')
const {cli} = require('cli-ux')
const configKey = 'publish_assets'
const {prettyPrint, formatError} = require('../../../util')  
const {getStack} = require('../../../utils/client.js')
let config

class AssetsCommand extends Command {
  async run() {
    const {flags} = this.parse(AssetsCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch (error) {
      this.error(error.message, {exit: 2})
    }
    if (this.validate(updatedFlags)) {
      let stack
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used')
        }
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        if (updatedFlags.folderUid === undefined) {
          // set default value for folderUid
          updatedFlags.folderUid = 'cs_root'
        }
        await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = {
          alias: updatedFlags.alias,
          host: this.config.userConfig.getRegion().cma
        }
        stack = getStack(config)
      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (!updatedFlags.retryFailed) {
            await start(updatedFlags, stack, config)
          } else {
            await start(updatedFlags)
          }
        } catch (error) {
          let message = formatError(error)
          this.error(message, {exit: 2})
        }
      } else {
        this.exit(0)
      }
    }
  }

  validate({environments, retryFailed, locales}) {
    let missing = []
    if (retryFailed) {
      return true
    }

    if (!environments || environments.length === 0) {
      missing.push('Environments')
    }

    if (!locales || locales.length === 0) {
      missing.push('Locales')
    }

    if (missing.length > 0) {
      this.error(`${missing.join(', ')} are required for processing this command. Please check --help for more details`, {exit: 2})
    } else {
      return true
    }
  }

  async confirmFlags(flags) {
    prettyPrint(flags)
    if(flags.yes) {
      return true
    }
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]')
    return confirmation
  }
}

AssetsCommand.description = `Publish assets to specified environments
The assets command is used for publishing assets from the specified stack, to the specified environments

Environment(s) and Locale(s) are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`

AssetsCommand.flags = {
  alias: flags.string({char: 'a', description: 'Alias for the management token to be used'}),
  retryFailed: flags.string({char: 'r', description: 'Retry publishing failed assets from the logfile (optional, will override all other flags)'}),
  environments: flags.string({char: 'e', description: 'Environments to which assets need to be published', multiple: true}),
  folderUid: flags.string({char: 'u', description: '[default: cs_root] Folder-uid from which the assets need to be published'}),
  bulkPublish: flags.string({char: 'b', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true'}),
  config: flags.string({char: 'c', description: 'Path to config file to be used'}),
  yes: flags.boolean({char: 'y', description: 'Agree to process the command with the current configuration' }),
  locales: flags.string({char: 'l', description: 'Locales to which assets need to be published', multiple: true }),
  'skip_workflow_stage_check': flags.boolean({char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK')}),
  query: flags.string({char: 'q', description: messageHandler.parse('CLI_BP_QUERIES')}),
}

AssetsCommand.examples = [
  'General Usage',
  'csdx cm:bulk-publish:assets -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:assets --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:assets -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:assets --retryFailed [LOG FILE NAME]',
  'csdx cm:bulk-publish:assets -r [LOG FILE NAME]'
]

module.exports = AssetsCommand
