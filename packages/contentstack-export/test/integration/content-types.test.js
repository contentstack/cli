const fs = require('fs');
const { promises: fsPromises } = fs;
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../lib/config');
const modules = config.modules;
const { getStackDetailsByRegion, getContentTypesCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const contentTypesBasePath = path.join(exportBasePath, modules.content_types.dirName);
    const contentTypesJson = path.join(contentTypesBasePath, modules.content_types.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export content-types', () => {
      describe('cm:stacks:export content-types [auth-token]', () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stub(cliUX, 'inquire', async (input) => {
            const { name } = input;
            switch (name) {
              case 'apiKey':
                return stackDetails[stack].STACK_API_KEY;
              case 'dir':
                return `${EXPORT_PATH}_${stack}`;
            }
          })
          .stdout({ print: PRINT_LOGS || false })
          .command(['cm:stacks:export', '--module', 'content-types'])
          .it('Check content-types count', async (_, done) => {
            let exportedContentTypesCount = 0;
            const contentTypesCount = await getContentTypesCount(stackDetails[stack]);

            try {
              if (fs.existsSync(contentTypesBasePath)) {
                let contentTypes = await fsPromises.readdir(contentTypesBasePath);
                exportedContentTypesCount = contentTypes.filter((ct) => !ct.includes('schema.json')).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(contentTypesCount, exportedContentTypesCount);
            done();
          });
      });

      describe('cm:stacks:export content-types [management-token]', () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command([
            'cm:stacks:export',
            '--stack-api-key',
            stackDetails[stack].STACK_API_KEY,
            '--data-dir',
            `${EXPORT_PATH}_${stack}`,
            '--alias',
            stackDetails[stack].ALIAS_NAME,
            '--module',
            'content-types',
          ])
          .it('Check content-types counts', async (_, done) => {
            let exportedContentTypesCount = 0;
            const contentTypesCount = await getContentTypesCount(stackDetails[stack]);

            try {
              if (fs.existsSync(contentTypesBasePath)) {
                let contentTypes = await fsPromises.readdir(contentTypesBasePath);
                exportedContentTypesCount = contentTypes.filter((ct) => !ct.includes('schema.json')).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(contentTypesCount, exportedContentTypesCount);
            done();
          });
      });
    });

    afterEach(async () => {
      await cleanUp(path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`));
      config.management_token = undefined;
      config.branch = undefined;
      config.branches = [];
    });
  }
};
