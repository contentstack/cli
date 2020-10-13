/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */
const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const {start} = require('../../../producer/unpublish')
const store = require('../../../util/store.js')
const configKey = 'Unpublish'
const { prettyPrint, formatError } = require('../../../util')
const { getStack } = require('../../../util/client.js')
let config

class UnpublishCommand extends Command {
  async run() {
    const {flags} = this.parse(UnpublishCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch(error) {
      this.error(error.message, {exit: 2})
    }

    if (this.validate(updatedFlags)) {
      let stack
      if (!updatedFlags.retryFailed) { 
        if (!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used')
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cli.prompt('Enter delivery token of your source environment')
        }
        updatedFlags.bulkUnpublish = (updatedFlags.bulkUnpublish === 'false') ? false : true
        await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = { 
          alias: updatedFlags.alias,
          host: this.config.userConfig.getRegion().cma,
          cda: this.config.userConfig.getRegion().cda,
        }
        stack = getStack(config)
      }
      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', {exit: 2})
      }

      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (!updatedFlags.retryFailed) {
            await start(updatedFlags, stack, config)
          } else {
            await start(updatedFlags)
          }
        } catch(error) {
          let message = formatError(error)
          this.error(message, {exit: 2})
        }
      } else {
        this.exit(0)
      }
    }
  }

  validate({environment, retryFailed, locale, onlyAssets, onlyEntries}) {
    let missing = []
    if (retryFailed) {
      return true
    }

    if (onlyAssets && onlyEntries) {
      this.error(`The flags onlyAssets and onlyEntries need not be used at the same time. Unpublish command unpublishes entries and assts at the same time by default`)
    }

    if (!environment) {
      missing.push('Environment')
    }

    // Adding !onlyAssets because if, onlyAssets is set to true, that means only assets are going to be unpublished. 
    // Then locale won't be necessary (turns out that this is not the case)
    // if (!locale && !onlyAssets) {
    //   missing.push('Locale')
    // }

    // Locales apply to assets as well
    if (!locale) {
      missing.push('Locale')
    }

    if (missing.length > 0) {
      this.error(`${missing.join(', ')} is required for processing this command. Please check --help for more details`, {exit: 2})
    } else {
      return true
    }
  }

  async confirmFlags(flags) {  
    let confirmation
    prettyPrint(flags)
    if(flags.yes) { 
      return true 
    } 

    if(!flags.contentType && !flags.onlyAssets) {
      confirmation = await cli.confirm('Do you want to continue with this configuration. This will unpublish all the entries from all content types? [yes or no]')
    } else {
      confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]') 
    }
    return confirmation 
  }
}

UnpublishCommand.description = `Unpublish entries of given Content Types from given environment
The unpublish command is used for unpublishing entries from given environment

Content Types, Environments and Locales are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`

UnpublishCommand.flags = {
  alias: flags.string({char: 'a', description: 'Alias for the management token to be used'}),
  retryFailed: flags.string({char: 'r', description: 'Retry publishing failed entries from the logfile'}),
  bulkUnpublish: flags.string({char: 'b', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true'}),
  contentType: flags.string({char: 't', description: 'Content Type filter'}),
  locale: flags.string({char: 'l', description: 'Locale filter'}),
  environment: flags.string({char: 'e', description: 'Source Environment'}),
  deliveryToken: flags.string({char: 'x', description: 'Delivery Token for source environment'}),
  config: flags.string({char: 'c', description: 'Path to config file to be used'}),
  yes: flags.boolean({char: 'y', description: 'Agree to process the command with the current configuration'}),
  onlyAssets: flags.boolean({description: 'Unpublish only assets', default: false}),
  onlyEntries: flags.boolean({description: 'Unpublish only entries', default: false}),
}

UnpublishCommand.usage = 'cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]'

UnpublishCommand.examples = [
  'Using --config or -c flag',
  'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
  'csdx cm:bulk-publish:unpublish --config [PATH TO CONFIG FILE]',
  'csdx cm:bulk-publish:unpublish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retryFailed or -r flag',
  'csdx cm:bulk-publish:unpublish --retryFailed [PATH TO LOG FILE]',
  'csdx cm:bulk-publish:unpublish -r [PATH TO LOG FILE]'
]

module.exports = UnpublishCommand
