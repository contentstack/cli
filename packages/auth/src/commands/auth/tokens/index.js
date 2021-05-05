const {Command} = require('@oclif/command')
const {cli} = require('cli-ux')
const Configstore = require('configstore')
// const chalk = require('chalk')

const config = new Configstore('contentstack_cli')

class TokenIndex extends Command {
  async run() {
    let managementTokens = config.get('tokens')
    let tokenOptions = []
    if (managementTokens && Object.keys(managementTokens).length > 0) {
      Object.keys(managementTokens).forEach(function (item) {
        tokenOptions.push({
          alias: item,
          token: managementTokens[item].token,
          apiKey: managementTokens[item].apiKey,
          environment: managementTokens[item].environment ? managementTokens[item].environment : '-',
          type: managementTokens[item].type,
        })
      })
      const {flags} = this.parse(TokenIndex)

      cli.table(tokenOptions,
        {
          alias: {
            minWidth: 7,
          },
          token: {
            minWidth: 7,
          },
          apiKey: {
            minWidth: 7,
          },
          environment: {
            minWidth: 7,
          },
          type: {
            minWidth: 7,
          },
        },
        {
          printLine: this.log,
          // eslint-disable-next-line node/no-unsupported-features/es-syntax
          ...flags, // parsed flags
        },
      )
    } else {
      cli.log('No tokens are added. Use auth:tokens:add command to add tokens.')
    }
  }
}

TokenIndex.description = `Lists all existing tokens added to the session 
`
TokenIndex.aliases = ['tokens']

TokenIndex.flags = cli.table.flags()

module.exports = TokenIndex
