const { join } = require('path')
const { existsSync, unlinkSync } = require('fs')
const { DEFAULT_TIMEOUT, PRINT_LOGS } = require("./config.json")
const { test } = require("@contentstack/cli-utilities/lib/oclif-test")
const LogoutCommand = require('@contentstack/cli-auth/lib/commands/auth/logout').default
const { cliux: CliUx, messageHandler, configHandler } = require("@contentstack/cli-utilities")


describe("Cleaning up", () => {
  let config

  // NOTE logging out
  let messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
  messageHandler.init({ messageFilePath });

  test
    .timeout(DEFAULT_TIMEOUT || 600000)
    .stub(CliUx, 'inquire', async () => 'Yes')
    .stdout({ print: PRINT_LOGS || false })
    .command(LogoutCommand)
    .do(() => {
      config = configHandler.init()
    })
    .do(() => {
      if (config && config.path) {
        let keyPath = config.path.split('/')
        keyPath.pop()
        keyPath.push(`${process.env.ENC_CONFIG_NAME}.json`)
        keyPath = keyPath.join('/')

        if (existsSync(keyPath)) {
          unlinkSync(keyPath) // NOTE remove test config encryption key file
        }

        if (existsSync(config.path)) {
          unlinkSync(config.path) // NOTE remove test config file
        }
      }
    })
    .it('Cleaning up is done', () => {
      config = ''
      messageHandler.init({ messageFilePath: '' });
    });
})
