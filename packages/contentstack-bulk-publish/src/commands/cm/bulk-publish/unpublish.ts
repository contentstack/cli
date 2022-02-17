/* eslint-disable no-console */
/* eslint-disable node/no-extraneous-require */

import {Command, flags} from '@contentstack/cli-command'
import {OclifConfig, Region} from '../../../interfaces'
import { unpublish } from '../../../producer'
import { cli } from 'cli-ux'
import { prettyPrint, formatError, messageHandler, interactive, store } from '../../../utils'

const configKey = 'Unpublish'
let config

class UnpublishCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly config: OclifConfig;
  private readonly region: Region;
  private readonly cmaHost: string;
  managementAPIClient: any;
  
  static description = `Unpublish entries of given Content Types from given environment
  The unpublish command is used for unpublishing entries from given environment

  Environment (Source Environment) and Locale are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required

  A Content Type can be specified for publishing entries, but if no content-type(s) is/are specified and --onlyAssets is not used,
  then all entries from all content types will be unpublished from the source environment

  --onlyAssets can be used to unpublish only assets and --onlyEntries can be used to unpublish only entries.
  (--onlyAssets and --onlyEntries cannot be used together at the same time)
  `

  static flags = {
    alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
    retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
    bulkUnpublish: flags.string({ char: 'B', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true' }),
    contentType: flags.string({ char: 't', description: 'Content Type filter' }),
    locale: flags.string({ char: 'l', description: 'Locale filter' }),
    environment: flags.string({ char: 'e', description: 'Source Environment' }),
    deliveryToken: flags.string({ char: 'x', description: 'Delivery Token for source environment' }),
    config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
    yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
    onlyAssets: flags.boolean({ description: 'Unpublish only assets', default: false }),
    onlyEntries: flags.boolean({ description: 'Unpublish only entries', default: false }),
    'skip_workflow_stage_check': flags.boolean({ char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK') }),
    query: flags.string({ char: 'q', description: messageHandler.parse('CLI_BP_QUERIES') }),
    branch: flags.string({ char: 'b', description: '[optional] branch name', default: 'main'})

  }

  static examples = [
    'General Usage',
    'csdx cm:bulk-publish:unpublish -b -t [CONTENT TYPE] -e [SOURCE ENV] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]',
    '',
    'Using --config or -c flag',
    'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
    'csdx cm:bulk-publish:unpublish --config [PATH TO CONFIG FILE]',
    'csdx cm:bulk-publish:unpublish -c [PATH TO CONFIG FILE]',
    '',
    'Using --retryFailed or -r flag',
    'csdx cm:bulk-publish:unpublish --retryFailed [LOG FILE NAME]',
    'csdx cm:bulk-publish:unpublish -r [LOG FILE NAME]',
    '',
    'No content type',
    'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] (Will unpublish all entries from all content types and assets from the source environment)',
    '',
    'Using --onlyAssets',
    'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyAssets (Will unpublish only assets from the source environment)',
    '',
    'Using --onlyEntries',
    'csdx cm:bulk-publish:unpublish --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries (Will unpublish only entries, all entries, from the source environment)',
    'csdx cm:bulk-publish:unpublish --contentType [CONTENT TYPE] --environment [SOURCE ENV] --locale [LOCALE] --onlyEntries (Will unpublish only entries, (from CONTENT TYPE) from the source environment)',
  ]

  async run() {
    const {flags} = this.parse(UnpublishCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch(error) {
      this.error(error.message, {exit: 2})
    }

    if (this.validate(updatedFlags)) {
      let stack, alias
      if (!updatedFlags.retryFailed) { 
        if(!updatedFlags.alias) {
          // updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used')
          alias = await interactive.askTokenAlias()
          updatedFlags.alias = alias.token
        } else {
          try {
            alias = await interactive.getTokenAlias(updatedFlags.alias)
          } catch (error) {
            const message = formatError(error)
            this.error(message, {exit: 2})
          }
        }
        if (!updatedFlags.deliveryToken) {
          updatedFlags.deliveryToken = await cli.prompt('Enter delivery token of your source environment')
        }
        updatedFlags.bulkUnpublish = (updatedFlags.bulkUnpublish === 'false') ? false : true
        // await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = { 
          alias: updatedFlags.alias.token,
          host: this.region.cma,
          cda: this.region.cda,
        }
        // stack = getStack(config)
        this.managementAPIClient = {host: this.cmaHost, headers: {branch: updatedFlags.branch}}
        stack = this.managementAPIClient.stack({api_key: alias.apiKey, management_token: alias.token})
      }
      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', {exit: 2})
      }

      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (!updatedFlags.retryFailed) {
            await unpublish(updatedFlags, stack, config)
          } else {
            await unpublish(updatedFlags)
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

module.exports = UnpublishCommand
