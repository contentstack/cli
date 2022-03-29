const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const Configstore  = require('configstore')
const inquirer = require('inquirer')
const Messages  = require('../../../util/messages')
const messages  = new Messages('remove').msgs

const config = new Configstore('contentstack_cli')

class RemoveCommand extends Command {
  async run() {
    const removeCommandFlags = this.parse(RemoveCommand).flags
    let alias = removeCommandFlags.alias
    let ignore = removeCommandFlags.ignore

    let token = config.get(`tokens.${alias}`)
    const tokens = config.get('tokens')
    let tokenOptions = []
    if (token || ignore) {
      config.delete(`tokens.${alias}`)
      return cli.log(`"${alias}" token removed successfully!`)
    }

    if (tokens && Object.keys(tokens).length > 0) {
      Object.keys(tokens).forEach(function (item) {
        tokenOptions.push(`${item}: ${tokens[item].token} : ${tokens[item].apiKey}${tokens[item].environment ? ' : ' + tokens[item].environment + ' ' : ''}: ${tokens[item].type}`)
      })
    } else {
      return cli.log('No tokens are added yet.')
    }

    let responses = await inquirer.prompt([{
      name: 'selectedTokens',
      message: 'Select tokens to remove.',
      type: 'checkbox',
      choices: tokenOptions,
    }])

    let selectedTokens =  responses.selectedTokens
    if (selectedTokens.length === 0) {
      return
    }
    selectedTokens.forEach(element => {
      let selectedToken = element.split(':')[0]
      config.delete(`tokens.${selectedToken}`)
      cli.log(Messages.parse(messages.msgRemoveTokenSuccess, selectedToken))
    })
  }
}

RemoveCommand.description = messages.commandDescription

RemoveCommand.flags = {
  alias: flags.string({char: 'a', description: messages.flagAliasDescription}),
  ignore: flags.boolean({char: 'i', description: messages.flagIgnoreDescription}),
}

RemoveCommand.aliases = ['tokens:remove']

module.exports = RemoveCommand
