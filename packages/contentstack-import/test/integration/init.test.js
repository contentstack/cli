const { join } = require('path');
const { test } = require('@contentstack/cli-dev-dependencies');
const { NodeCrypto, messageHandler } = require('@contentstack/cli-utilities');

const { getEnvData, getStackDetailsByRegion } = require('./utils/helper');
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default;
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const RegionSetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default;
const { DEFAULT_TIMEOUT, PRINT_LOGS, encryptionKey } = require('./config.json');

const { ENCRYPTION_KEY } = getEnvData();
const { DELIMITER, KEY_VAL_DELIMITER } = process.env;

const crypto = new NodeCrypto({
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  encryptionKey: ENCRYPTION_KEY || encryptionKey
});

module.exports = (region) => {
  const username = ENCRYPTION_KEY ? crypto.decrypt(region.USERNAME) : region.USERNAME
  const password = ENCRYPTION_KEY ? crypto.decrypt(region.PASSWORD) : region.PASSWORD

  const stackDetails = getStackDetailsByRegion(region.REGION, DELIMITER, KEY_VAL_DELIMITER);

  function addTokens(stacks) {
    let stack = stacks.pop()
    test
      .command(AddTokenCommand, ['-a', stackDetails[stack].ALIAS_NAME, '-k', stackDetails[stack].STACK_API_KEY, '--management', '--token', stackDetails[stack].MANAGEMENT_TOKEN, '-y'])
      .it(`Adding token for ${stack}`, (_, done) => {
        console.log('done')
        done()
      })
    if (stacks.length > 0) {
      addTokens(stacks)
    }
  }

  describe('Setting Pre-requests.', () => {
    let messageFilePath = join(__dirname, '..', '..', '..', 'contentstack-config', 'messages/index.json');
    messageHandler.init({ messageFilePath });
    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(RegionSetCommand, [`${region.REGION || 'NA'}`])
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
        messageFilePath = '';
        messageHandler.init({ messageFilePath: '' });
      });

    // addTokens(Object.keys(stackDetails));
  })
};
