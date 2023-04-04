const { join } = require('path')
const { test } = require("@contentstack/cli-dev-dependencies")
const { NodeCrypto, messageHandler } = require("@contentstack/cli-utilities")

const { getEnvData } = require('./utils/helper')
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default
const AddTokeCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default
const RegionGetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default
const { DEFAULT_TIMEOUT, PRINT_LOGS, REGION_NAME, ALIAS_NAME } = require("./config.json")

const { ENCRYPTION_KEY, USERNAME, PASSWORD, NA: { BRANCH: { STACK_API_KEY, MANAGEMENT_TOKEN } } } = getEnvData()

const crypto = new NodeCrypto({
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  encryptionKey: ENCRYPTION_KEY || 'gjh67567mn'
});

const username = ENCRYPTION_KEY ? crypto.decrypt(USERNAME) : USERNAME
const password = ENCRYPTION_KEY ? crypto.decrypt(PASSWORD) : PASSWORD

describe("Setting Pre-requests.", () => {
  let messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-config', 'messages/index.json');
  messageHandler.init({ messageFilePath });
  test
    .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
    .stdout({ print: PRINT_LOGS || false })
    .command(RegionGetCommand, [`${REGION_NAME || 'NA'}`])
    .do(() => {
      messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
      messageHandler.init({ messageFilePath });
    })
    .command(LoginCommand, [`-u=${username}`, `-p=${password}`])
    .do(() => {
      messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
      messageHandler.init({ messageFilePath });
    })
    .command(AddTokeCommand, ['-a', ALIAS_NAME, '-k', STACK_API_KEY, '--management', '--token', MANAGEMENT_TOKEN])
    .it('Pre-config is done', () => {
      messageFilePath = ''
      messageHandler.init({ messageFilePath: '' })
    })
})
