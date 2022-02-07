import {Command, flags} from '@contentstack/cli-command'
import { OclifConfig, Region } from '../../../interfaces'
import { publishAssets } from '../../../producer'
import {cli} from 'cli-ux'
import { prettyPrint, formatError, messageHandler, interactive, store } from '../../../utils'

const configKey = 'publish_assets'
let config

export default class AssetsCommand extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly config: OclifConfig;
  private readonly region: Region;
  private readonly cmaHost: string;
  managementAPIClient: any;

  static description = `Publish assets to specified environments
  The assets command is used for publishing assets from the specified stack, to the specified environments

  Environment(s) and Locale(s) are required for executing the command successfully
  But, if retryFailed flag is set, then only a logfile is required
  `

  static flags = {
    alias: flags.string({ char: 'a', description: 'Alias for the management token to be used' }),
    retryFailed: flags.string({ char: 'r', description: 'Retry publishing failed assets from the logfile (optional, will override all other flags)' }),
    environments: flags.string({ char: 'e', description: 'Environments to which assets need to be published', multiple: true }),
    folderUid: flags.string({ char: 'u', description: '[default: cs_root] Folder-uid from which the assets need to be published' }),
    bulkPublish: flags.string({ char: 'B', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true' }),
    config: flags.string({ char: 'c', description: 'Path to config file to be used' }),
    yes: flags.boolean({ char: 'y', description: 'Agree to process the command with the current configuration' }),
    locales: flags.string({ char: 'l', description: 'Locales to which assets need to be published', multiple: true }),
    'skip_workflow_stage_check': flags.boolean({ char: 'w', description: messageHandler.parse('CLI_BP_SKIP_WORKFLOW_STAGE_CHECK') }),
    query: flags.string({ char: 'q', description: messageHandler.parse('CLI_BP_QUERIES') }),
    branch: flags.string({ char: 'b', description: '[optional] branch name', default: 'main'})
  }

  static examples = [
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
  
  async run(): Promise<void> {
    const {flags} = this.parse(AssetsCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch (error) {
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
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        if (updatedFlags.folderUid === undefined) {
          // set default value for folderUid
          updatedFlags.folderUid = 'cs_root'
        }
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
            await publishAssets(updatedFlags, stack, config)
          } else {
            await publishAssets(updatedFlags)
          }
        } catch (error) {
          const message = formatError(error)
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
