let defaultConfig = require('../../src/config/default');
const fs = require('fs');
const { promises: fsPromises } = fs;
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../src/config');
const modules = config.modules;
const { getStackDetailsByRegion, getEntriesCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const entriesBasePath = path.join(exportBasePath, modules.entries.dirName);
    const entriesJson = path.join(entriesBasePath, modules.entries.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export entries', () => {
      describe('cm:stacks:export entries [auth-token]', () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stub(cliUX, 'prompt', async (name) => {
            switch (name) {
              case promptMessageList.promptSourceStack:
                return stackDetails[stack].STACK_API_KEY;
              case promptMessageList.promptPathStoredData:
                return `${EXPORT_PATH}_${stack}`;
            }
          })
          .stdout({ print: PRINT_LOGS || false })
          .command(['cm:stacks:export', '--module', 'entries'])
          .it('Check entries count', async () => {
            let exportedEntriesCount = 0;
            let entriesCount;

            try {
              entriesCount = await getEntriesCount(stackDetails[stack]);
              if (fs.existsSync(entriesBasePath)) {
                let contentTypes = await fsPromises.readdir(entriesBasePath);
                for (let contentType of contentTypes) {
                  let ctPath = path.join(entriesBasePath, contentType);
                  let locales = await fsPromises.readdir(ctPath);
                  for (let locale of locales) {
                    let entries = await fsPromises.readFile(path.join(ctPath, locale), 'utf-8');
                    exportedEntriesCount += Object.keys(JSON.parse(entries)).length;
                  }
                }
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(entriesCount, exportedEntriesCount);
          });
      });

      describe('cm:stacks:export entries [management-token]', () => {
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
            'entries',
          ])
          .it('Check entries counts', async () => {
            let exportedEntriesCount = 0;
            const entriesCount = await getEntriesCount(stackDetails[stack]);

            try {
              if (fs.existsSync(entriesBasePath)) {
                let contentTypes = await fsPromises.readdir(entriesBasePath);
                for (let contentType of contentTypes) {
                  let ctPath = path.join(entriesBasePath, contentType);
                  let locales = await fsPromises.readdir(ctPath);
                  for (let locale of locales) {
                    let entries = await fsPromises.readFile(path.join(ctPath, locale), 'utf-8');
                    exportedEntriesCount += Object.keys(JSON.parse(entries)).length;
                  }
                }
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(entriesCount, exportedEntriesCount);
          });
      });
    });

    afterEach(async () => {
      await cleanUp(path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`));
      defaultConfig.management_token = undefined;
      defaultConfig.branch = undefined;
      defaultConfig.branches = [];
    });
  }
};
