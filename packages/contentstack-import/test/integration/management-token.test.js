const fs = require('fs');
const { promises: fsPromises } = fs;
const path = require('path');
const { expect, test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { modules } = require('../../src/config/default');
const { getStacksFromEnv, getContentTypesCount } = require('./utils/helper');
const { PRINT_LOGS, IMPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { DELIMITER, KEY_VAL_DELIMITER } = process.env;

async function exec() {
  const stacksFromEnv = getStacksFromEnv();

  for (const stack of stacksFromEnv) {
    const stackDetails = {};
    stackDetails['isBranch'] = (stack.split('_', 3).pop() === 'NON') ? true : false;
    process.env[stack].split(DELIMITER).forEach(element => {
      const [key, value] = element.split(KEY_VAL_DELIMITER);
      stackDetails[key] = value;
    });

    const exportBasePath = (stackDetails.isBranch)
      ? path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`, stackDetails.branch || 'main')
      : path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`);
    
    const contentTypesBasePath = path.join(exportBasePath, modules.content_types.dirName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
    
    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('Contentstack-Import plugin test [--alias=common_mgmt_token]', () => {
      beforeEach(done => {
        console.log('before');
      });
      afterEach(done => {
        console.log('after');
      });
      describe('Import complex stack using management token', () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE: setting default as 10 minutes
          .stub(cliUX, 'prompt', async name => {
            switch (name) {
              case promptMessageList.promptPathStoredData:
                return `${IMPORT_PATH}_${stack}`;
            }
          })
          .stdout({ print: PRINT_LOGS || false })
          .command(['cm:stacks:import', '-a', 'common_mgmt_token'])
          .it('should work without any errors', async, (_, done) => {
            done();
          });
      });
    });
  }
}

exec();