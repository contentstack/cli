const { join } = require('path')
const { existsSync, unlinkSync } = require('fs')
const { test, expect } = require("./oclif-test")
const { DEFAULT_TIMEOUT, PRINT_LOGS } = require("./config.json")
const LogoutCommand = require('@contentstack/cli-auth/lib/commands/auth/logout').default
const { cliux: CliUx, messageHandler, configHandler } = require("@contentstack/cli-utilities")

describe("Clear all the configurations used to perform the export.", () => {
  describe('Logging out', async () => {
    const messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');

    beforeEach(() => {
      messageHandler.init({ messageFilePath });
    })

    afterEach(() => {
      messageHandler.init({ messageFilePath: '' });
    });

    test
      .timeout(DEFAULT_TIMEOUT || 600000)
      .stub(CliUx, 'inquire', async () => 'Yes')
      .stdout({ print: PRINT_LOGS || false })
      .command(LogoutCommand)
      .it('Logout should succeed.!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Successfully logged out');
      });
  })

  describe('Remove the config file', async () => {
    let config

    beforeEach(() => {
      config = configHandler.init()
    })

    afterEach(() => {
      config = ''
    })

    test
      .timeout(DEFAULT_TIMEOUT || 600000)
      .stdout({ print: PRINT_LOGS || false })
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
            console.log('Config file removed.!')
          }
        }
      })
      .it('Config file removed', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Config file removed.!');
      });
  })
})
