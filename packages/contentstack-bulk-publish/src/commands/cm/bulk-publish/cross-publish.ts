/* eslint-disable node/no-extraneous-require */
import {Command, flags} from '@contentstack/cli-command'
import { OclifConfig, Region } from '../../../interfaces'
import { crossPublish } from '../../../producer'
import {cli} from 'cli-ux'
import { prettyPrint, formatError, messageHandler, interactive, store } from '../../../utils'
const configKey = 'cross_env_publish'

let config

export default class CrossPublishCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly config: OclifConfig;
  private readonly cmaHost: string;
  region: Region;
  managementAPIClient: any;

  static description = `Publish entries and assets from one environment to other environments
  The cross-publish command is used for publishing entries and assets from one evironment to other environments

  Content Type, Environment, Destination Environment(s) and Locale are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required
  `

  static flags = {
    alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
    retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)' }),
    bulkPublish: flags.string({ char: 'B', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true' }),
    contentType: flags.string({ char: 't', description: 'Content-Type filter' }),
    locale: flags.string({ char: 'l', description: 'Locale filter' }),
    environment: flags.string({ char: 'e', description: 'Source Environment' }),
    deliveryToken: flags.string({ char: 'x', description: 'Delivery Token for source environment' }),
    destEnv: flags.string({ char: 'd', description: 'Destination Environments', multiple: true }),
    config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
    yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
    'skip_workflow_stage_check': flags.boolean({ char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK') }),
    query: flags.string({ char: 'q', description: messageHandler.parse('CLI_BP_QUERIES') }),
    branch: flags.string({ char: 'b', description: '[optional] branch name', default: 'main'})
  }

  static examples = [
    'General Usage',
    'csdx cm:bulk-publish:cross-publish -t [CONTENT TYPE] -e [SOURCE ENV] -d [DESTINATION ENVIRONMENT] -l [LOCALE] -a [MANAGEMENT TOKEN ALIAS] -x [DELIVERY TOKEN]',
    '',
    'Using --config or -c flag',
    'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
    'csdx cm:bulk-publish:cross-publish --config [PATH TO CONFIG FILE]',
    'csdx cm:bulk-publish:cross-publish -c [PATH TO CONFIG FILE]',
    '',
    'Using --retryFailed or -r flag',
    'csdx cm:bulk-publish:cross-publish --retryFailed [LOG FILE NAME]',
    'csdx cm:bulk-publish:cross-publish -r [LOG FILE NAME]'
  ]

  async run(): Promise<void> {
    const {flags} = this.parse(CrossPublishCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch(error) {
      this.error(error.message, {exit: 2})
    }

    if (this.validate(updatedFlags)) {
      let stack, alias
      if (!updatedFlags.retryFailed) {
        if (!updatedFlags.alias) {
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
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        // await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = { 
          alias: updatedFlags.alias.token,
          host: this.region.cma,
          cda: this.region.cda,
        }
        // stack = getStack(config)
        this.managementAPIClient = { host: this.cmaHost, headers: { branch: updatedFlags.branch } }
        stack = this.managementAPIClient.stack({ api_key: alias.apiKey, management_token: alias.token })
      }

      if (!updatedFlags.deliveryToken && updatedFlags.deliveryToken.length === 0) {
        this.error('Delivery Token is required for executing this command', {exit: 2})
      }

      if (await this.confirmFlags(updatedFlags)) {
        updatedFlags.filter = {}
        updatedFlags.filter.locale = updatedFlags.locale
        delete updatedFlags.locale

        if (updatedFlags.contentType && updatedFlags.contentType.length > 0) {
          updatedFlags.filter.content_type_uid = updatedFlags.contentType
          delete updatedFlags.contentType
        }

        if (updatedFlags.environment && updatedFlags.environment.length > 0) {
          updatedFlags.filter.environment = updatedFlags.environment
          delete updatedFlags.environment
        }
        try {
          if (!updatedFlags.retryFailed) {
            await crossPublish(updatedFlags, stack, config)
          } else {
            await crossPublish(updatedFlags)
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

  validate({environment, retryFailed, contentType, destEnv, locale}) {
    let missing = []
    if (retryFailed) {
      return true
    }

    if (!environment) {
      missing.push('Environment')
    }

    if (!destEnv) {
      missing.push('Destination Environment')
    }

    if (!contentType) {
      missing.push('ContentType')
    }

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
    prettyPrint(flags)
    if(flags.yes) {
      return true
    }
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]')
    return confirmation
  }
}

