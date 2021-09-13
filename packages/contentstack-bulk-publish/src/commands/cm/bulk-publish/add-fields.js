const {Command, flags} = require('@oclif/command')
const {start} = require('../../../producer/add-fields')
const store = require('../../../util/store.js')
const {cli} = require('cli-ux')
const configKey = 'addFields'
const { prettyPrint, formatError } = require('../../../util')
const { getStack } = require('../../../util/client.js')
let config

class AddFieldsCommand extends Command {
  async run() {
    const {flags} = this.parse(AddFieldsCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch(error) {
      this.error(error.message, {exit: 2})
    }
    if (this.validate(updatedFlags)) {
      let stack
      if (!updatedFlags.retryFailed) {
        if(!updatedFlags.alias) {
          updatedFlags.alias = await cli.prompt('Please enter the management token alias to be used')
        }
        updatedFlags.bulkPublish = (updatedFlags.bulkPublish === 'false') ? false : true
        await this.config.runHook('validateManagementTokenAlias', {alias: updatedFlags.alias})
        config = {
          alias: updatedFlags.alias,
          host: this.config.userConfig.getRegion().cma,
          branch: flags.branch,
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
        } catch(error) {
          let message = formatError(error)
          this.error(message, {exit: 2})
        }
      } else {
        this.exit(0)
      }
    }
  }

  validate({contentTypes, locales, environments, retryFailed}) {
    let missing = []
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

AddFieldsCommand.description = `Add fields from updated content types to their respective entries
The add-fields command is used for updating already existing entries with the updated schema of their respective Content Type

Content Types, Environments and Locales are required for executing the command successfully
But, if retryFailed flag is set, then only a logfile is required
`

AddFieldsCommand.flags = {
  alias: flags.string({char: 'a', description: 'Alias for the management token to be used'}),
  retryFailed: flags.string({char: 'r', description: 'Retry publishing failed entries from the logfile (optional, overrides all other flags)'}),
  bulkPublish: flags.string({char: 'b', description: 'This flag is set to true by default. It indicates that contentstack\'s bulkpublish API will be used for publishing the entries', default: 'true'}),
  contentTypes: flags.string({char: 't', description: 'The Content-Types from which entries need to be published', multiple: true}),
  locales: flags.string({char: 'l', description: 'Locales to which entries need to be published', multiple: true}),
  environments: flags.string({char: 'e', description: 'Environments to which entries need to be published', multiple: true}),
  config: flags.string({char: 'c', description: 'Path to config file to be used'}),
  yes: flags.boolean({char: 'y', description: 'Agree to process the command with the current configuration'}),
  branch: flags.string({char: 'n', default: 'master', description: 'Specify the branch to fetch the content from (default is master branch)'}),
}

AddFieldsCommand.examples = [
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
  'csdx cm:bulk-publish:add-fields -r [LOG FILE NAME]',
  '',
  'Using --branch or -n flag',
  'csdx cm:bulk-publish:add-fields -t [CONTENT TYPE 1] [CONTENT TYPE 2] -e [ENVIRONMENT 1] [ENVIRONMENT 2] -l [LOCALE 1] [LOCALE 2] -a [MANAGEMENT TOKEN ALIAS] -n [BRANCH NAME]',
]

module.exports = AddFieldsCommand
