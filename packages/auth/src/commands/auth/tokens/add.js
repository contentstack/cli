const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const chalk  = require('chalk')
const debug  = require('debug')('csdx:tokens:add')
const Configstore  = require('configstore')
const Messages  = require('../../../util/messages')
const messages  = new Messages('add').msgs

const config = new Configstore('contentstack_cli')

class AddCommand extends Command {
  async run() {
    let isReplace = false
    const {flags} = this.parse(AddCommand)
    let forced = flags.force
    let alias = flags.alias
    let apiKey = flags['api-key']
    let token = flags.token
    let isDelivery = flags.delivery
    let isManagement = flags.management
    let environment = flags.environment
    let configKeyTokens = 'tokens'
    let type = (isDelivery || Boolean(environment)) ? 'delivery' : 'management'
    debug(`Adding ${type} token`)

    // eslint-disable-next-line no-warning-comments
    // TODO: Handle condition where token and api combination matched

    if (!alias)
      alias = await cli.prompt(messages.promptTokenAlias)
    isReplace = Boolean(config.get(`${configKeyTokens}.${alias}`))// get to Check if alias already present

    if (isReplace && !forced) {
      isReplace = true
      const confirm = await cli.confirm(Messages.parse(messages.promptConfirmReplaceToken, alias))
      if (!confirm)
        this.exit()
    }

    if (!apiKey)
      apiKey = await cli.prompt(messages.promptAPIKey)
    if (!token)
      token = await cli.prompt(Messages.parse(messages.promptToken, type))
    if (isDelivery && !environment)
      environment = await cli.prompt(messages.promptEnv)

    if (isManagement)
      config.set(`${configKeyTokens}.${alias}`, {token, apiKey, type})
    else
      config.set(`${configKeyTokens}.${alias}`, {token, apiKey, environment, type})

    if (isReplace)
      cli.log(chalk.green(Messages.parse(messages.msgReplacedTokenSuccess, alias)))
    else
      cli.log(chalk.green(Messages.parse(messages.msgAddTokenSuccess, alias)))
  }
}

AddCommand.description = `${messages.commandDescription}
by default it adds management token if either of management or delivery flags are not set`

AddCommand.flags = {
  alias: flags.string({char: 'a', description: messages.flagAliasDescription}),
  delivery: flags.boolean({
    char: 'd',
    description: 'Set this while saving delivery token',
    exclusive: ['management'],
  }),
  management: flags.boolean({
    char: 'm',
    description: 'Set this while saving management token',
    exclusive: ['delivery', 'environment'],
  }),
  environment: flags.string({
    char: 'e',
    description: 'Environment name for delivery token',
    exclusive: ['management'],
  }),
  'api-key': flags.string({char: 'k', description: messages.flagAPIKeyDescription}),
  force: flags.boolean({char: 'f', description: messages.flagForceDescription}),
  token: flags.string({char: 't', description: messages.flagTokenDescription, env: 'TOKEN'}),
}

AddCommand.aliases = ['tokens:add']

module.exports = AddCommand
