import {Command, flags} from '@contentstack/cli-command'
import {OclifConfig, Region} from '../../../interfaces'
import * as store from '../../../utils/store'
import { addFields } from '../../../producer'
import { cli } from 'cli-ux'
import { prettyPrint, formatError, messageHandler, interactive } from '../../../utils'
const configKey = 'addFields'

let config

export default class AddFieldsCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly config: OclifConfig;
  private readonly region: Region;

  static description = `Add fields from updated content types to their respective entries
  The add-fields command is used for updating already existing entries with the updated schema of their respective Content Type

  Content Types, Environments and Locales are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required
  `

  static flags = {
    alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
    retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)' }),
    bulkPublish: flags.string({ char: 'B', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true' }),
    contentTypes: flags.string({ char: 't', description: 'The Content-Types from which entries need to be published', multiple: true }),
    locales: flags.string({ char: 'l', description: 'Locales to which entries need to be published', multiple: true }),
    environments: flags.string({ char: 'e', description: 'Environments to which entries need to be published', multiple: true }),
    config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
    yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
    'skip_workflow_stage_check': flags.boolean({ char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK') }),
    query: flags.string({ char: 'q', description: messageHandler.parse('CLI_BP_QUERIES') }),
    branch: flags.string({ char: 'b', description: '[optional] branch name', default: 'main'})
  }

  static examples = [
    'General Usage',
    'csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS]',
    '',
    'Using --config or -c flag',
    'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
    'csdx cm:bulk-publish:add-fields --config [PATH TO CONFIG FILE]',
    'csdx cm:bulk-publish:add-fields -c [PATH TO CONFIG FILE]',
    '',
    'Using --retryFailed or -r flag',
    'csdx cm:bulk-publish:add-fields --retryFailed [LOG FILE NAME]',
    'csdx cm:bulk-publish:add-fields -r [LOG FILE NAME]'
  ]

  async run(): Promise<void> {
    const {flags} = this.parse(AddFieldsCommand)
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
            alias = await interactive.getTokenFromAlias(updatedFlags.alias)
          } catch (error) {
            const message = formatError(error)
            this.error(message, {exit: 2})
          }
        }
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        // await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = { 
          alias: updatedFlags.alias.token,
          host: this.region.cma
        }
        // stack = getStack(config)
        this.managementAPIClient = {host: this.cmaHost, headers: {branch: updatedFlags.branch}}
        stack = this.managementAPIClient.stack({api_key: alias.apiKey, management_token: alias.token})
        // stack = getStack(config)

      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (!updatedFlags.retryFailed) {
            await addFields(updatedFlags, stack, config)
          } else {
            await addFields(updatedFlags)
          }
        } catch(error) {
          const message = formatError(error)
          this.error(message, {exit: 2})
        }
      } else {
        this.exit(0)
      }
    }
  }

  validate({contentTypes, locales, environments, retryFailed}) {
    const missing = []
    if (retryFailed) {
      return true
    }

    if (!contentTypes || contentTypes.length === 0) {
      missing.push('Content Types')
    }

    if (!locales || locales.length === 0) {
      missing.push('Locales')
    }

    if (!environments || environments.length === 0) {
      missing.push('Environments')
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
