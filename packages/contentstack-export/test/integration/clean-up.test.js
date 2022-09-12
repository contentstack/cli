const { join } = require('path')
const { existsSync, unlinkSync } = require('fs')
const { test } = require("@contentstack/cli-dev-dependencies")

const { getEnvData } = require('./utils/helper')
const { DEFAULT_TIMEOUT, PRINT_LOGS, ALIAS_NAME } = require("./config.json")
const LogoutCommand = require('@contentstack/cli-auth/lib/commands/auth/logout').default
const RemoveTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/remove').default
const { cliux: CliUx, messageHandler, configHandler } = require("@contentstack/cli-utilities")

const { ENC_CONFIG_NAME } = getEnvData()

describe("Cleaning up", () => {
  let config

  // NOTE logging out
  let messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
  messageHandler.init({ messageFilePath });

  test
    .timeout(DEFAULT_TIMEOUT || 600000)
    .stub(CliUx, 'inquire', async () => true)
    .stdout({ print: PRINT_LOGS || false })
    .command(LogoutCommand)
    .do(() => {
      config = configHandler.init()
    })
    .do(() => {
      if (config && config.path) {
        let keyPath = config.path.split('/')
        keyPath.pop()
        keyPath.push(`${ENC_CONFIG_NAME}.json`)
        keyPath = keyPath.join('/')

        if (existsSync(keyPath)) {
          unlinkSync(keyPath) // NOTE remove test config encryption key file
        }

        if (existsSync(config.path)) {
          unlinkSync(config.path) // NOTE remove test config file
        }
      }
    })
    .command(RemoveTokenCommand, ['-a', ALIAS_NAME])
    .it('Cleaning up is done', () => {
      config = ''
      messageHandler.init({ messageFilePath: '' });
    });
})
