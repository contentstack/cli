const { join } = require('path')
const { test } = require("@contentstack/cli-dev-dependencies")
const { NodeCrypto, messageHandler } = require("@contentstack/cli-utilities")

const { getEnvData, getStacksFromEnv } = require('./utils/helper')
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default
const RegionGetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default
const { DEFAULT_TIMEOUT, PRINT_LOGS, REGION_NAME, ALIAS_NAME } = require("./config.json")

const { ENCRYPTION_KEY, USERNAME, PASSWORD } = getEnvData()
const { APP_ENV, DELIMITER, KEY_VAL_DELIMITER } = process.env

const stacksFromEnv = getStacksFromEnv()
const stackDetails = {}
for (let stack of stacksFromEnv) {
  stackDetails[stack] = {}
  process.env[stack].split(DELIMITER).forEach(element => {
    let [key, value] = element.split(KEY_VAL_DELIMITER)
    stackDetails[stack][key] = value;
  })
}

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
    .it('Pre-config is done', () => {
      messageFilePath = ''
      messageHandler.init({ messageFilePath: '' })
    })

    for(let stack of stacksFromEnv) {
      test
        .command(AddTokenCommand, ['-a', stackDetails[stack].ALIAS_NAME, '-k', stackDetails[stack].STACK_API_KEY, '--management', '--token', stackDetails[stack].MANAGEMENT_TOKEN])
        .it(`Adding token for ${stack}`, (_, done) => {
          console.log('done')
          done()
        })
    }
})
