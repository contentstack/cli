let defaultConfig = require('../../src/config/default');
const fs = require('fs');
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../src/config');
const modules = config.modules;
const { getStackDetailsByRegion, getWebhooksCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails.BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const webhooksBasePath = path.join(exportBasePath, modules.webhooks.dirName);
    const webhooksJson = path.join(webhooksBasePath, modules.webhooks.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export webhooks', () => {
      describe('cm:stacks:export webhooks [auth-token]', () => {
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
          .command(['cm:stacks:export', '--module', 'webhooks'])
          .it('Check webhooks count', async () => {
            let exportedWebhooksCount = 0;
            const webhooksCount = await getWebhooksCount(stackDetails[stack]);

            try {
              if (fs.existsSync(webhooksJson)) {
                exportedWebhooksCount = Object.keys(JSON.parse(fs.readFileSync(webhooksJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(webhooksCount, exportedWebhooksCount);
          });
      });

      describe('cm:stacks:export webhooks [management-token]', () => {
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
            'webhooks',
          ])
          .it('Check Webhooks counts', async () => {
            let exportedWebhooksCount = 0;
            const webhooksCount = await getWebhooksCount(stackDetails[stack]);

            try {
              if (fs.existsSync(webhooksJson)) {
                exportedWebhooksCount = Object.keys(JSON.parse(fs.readFileSync(webhooksJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(webhooksCount, exportedWebhooksCount);
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
