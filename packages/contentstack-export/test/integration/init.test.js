const { join } = require('path')
const { test, expect } = require("./oclif-test")
const { NodeCrypto, messageHandler } = require("@contentstack/cli-utilities")
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default
const RegionGetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default
const { USERNAME, PASSWORD, ENCRYPTION_KEY, DEFAULT_TIMEOUT, PRINT_LOGS, REGION_NAME } = require("./config.json")

const crypto = new NodeCrypto({
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  encryptionKey: ENCRYPTION_KEY || 'gjh67567mn',
});
const username = ENCRYPTION_KEY ? crypto.decrypt(USERNAME) : USERNAME;
const password = ENCRYPTION_KEY ? crypto.decrypt(PASSWORD) : PASSWORD;

describe("Set all the configurations to perform the export.", () => {
  describe('Setting region', async () => {
    const messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-config', 'messages/index.json');

    beforeEach(() => {
      messageHandler.init({ messageFilePath });
    })

    afterEach(() => {
      messageHandler.init({ messageFilePath: '' });
    });

    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(RegionGetCommand, [`${REGION_NAME || 'NA'}`])
      .it('Setting region is done', (ctx) => {
        expect(ctx.stdout).to.be.a('string').that.have.includes(`Region has been set to ${REGION_NAME || 'NA'}`);
      })
  })

  describe('Authenticate', async () => {
    const messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');

    beforeEach(() => {
      messageHandler.init({ messageFilePath });
    })

    afterEach(() => {
      messageHandler.init({ messageFilePath: '' });
    });

    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(LoginCommand, [`-u=${username}`, `-p=${password}`])
      .it('Login should complete', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Successfully logged in!!');
      });
  })
})
