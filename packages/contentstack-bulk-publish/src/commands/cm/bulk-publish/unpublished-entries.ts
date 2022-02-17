import {Command, flags} from '@contentstack/cli-command'
import {OclifConfig, Region} from '../../../interfaces'
import { publishUnpublishedEnv } from '../../../producer'
import { cli } from 'cli-ux'
import { prettyPrint, formatError, messageHandler, interactive, store } from '../../../utils'

const configKey = 'publish_unpublished_env'
let config

class UnpublishedEntriesCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly config: OclifConfig;
  private readonly region: Region;
  private readonly cmaHost: string;
  managementAPIClient: any;

  static description = `Publish unpublished entries from the source environment, to other environments and locales
  The unpublished-entries command is used for publishing unpublished entries from the source environment, to other environments and locales

  Content Type(s), Source Environment, Destination Environment(s) and Source Locale are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required
  `

  static flags = {
    alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
    retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed entries from the logfile' }),
    bulkPublish: flags.string({ char: 'B', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true' }),
    sourceEnv: flags.string({ char: 's', description: 'Source Env' }),
    contentTypes: flags.string({ char: 't', description: 'The Content-Types from which entries need to be published', multiple: true }),
    locale: flags.string({ char: 'l', description: 'Source locale' }),
    environments: flags.string({ char: 'e', description: 'Destination environments', multiple: true }),
    config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
    yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
    'skip_workflow_stage_check': flags.boolean({ char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK') }),
    query: flags.string({ char: 'q', description: messageHandler.parse('CLI_BP_QUERIES') }),
    branch: flags.string({ char: 'b', description: '[optional] branch name', default: 'main'})
  }

  static examples = [
    'General Usage',
    'csdx cm:bulk-publish:unpublished-entries -b -t [CONTENT TYPES] -e [ENVIRONMENTS] -l LOCALE -a [MANAGEMENT TOKEN ALIAS]',
    '',
    'Using --config or -c flag',
    'Generate a config file at the current working directory using `csdx cm:bulk-publish:configure -a [ALIAS]`',
    'csdx cm:bulk-publish:unpublished-entries --config [PATH TO CONFIG FILE]',
    'csdx cm:bulk-publish:unpublished-entries -c [PATH TO CONFIG FILE]',
    '',
    'Using --retryFailed or -r flag',
    'csdx cm:bulk-publish:unpublished-entries --retryFailed [LOG FILE NAME]',
    'csdx cm:bulk-publish:unpublished-entries -r [LOG FILE NAME]'
  ]
  async run() {
    const {flags} = this.parse(UnpublishedEntriesCommand)
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
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        // await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = { 
          alias: updatedFlags.alias.token,
          host: this.region.cma
        }
        // stack = getStack(config)
        this.managementAPIClient = {host: this.cmaHost, headers: {branch: updatedFlags.branch}}
        stack = this.managementAPIClient.stack({api_key: alias.apiKey, management_token: alias.token})
      }
      if (await this.confirmFlags(updatedFlags)) {
        try {
          if (!updatedFlags.retryFailed) {
            await publishUnpublishedEnv(updatedFlags, stack, config)
          } else {
            await publishUnpublishedEnv(updatedFlags)
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

  validate({contentTypes, environments, sourceEnv, locale, retryFailed}) {
    let missing = []
    if (retryFailed) {
      return true
    }

    if (!contentTypes || contentTypes.length === 0) {
      missing.push('Content Types')
    }

    if (!sourceEnv) {
      missing.push('SourceEnv')
    }

    if (!environments || environments.length === 0) {
      missing.push('Environments')
    }

    if (!locale) {
      missing.push('Source Locale')
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

module.exports = UnpublishedEntriesCommand
