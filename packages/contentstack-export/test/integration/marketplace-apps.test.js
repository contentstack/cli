let defaultConfig = require('../../src/config/default');
const fs = require('fs');
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../src/config');
const modules = config.modules;
const { getStackDetailsByRegion, getMarketplaceAppsCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const marketplaceAppsBasePath = path.join(exportBasePath, modules.marketplace_apps.dirName);
    const marketplaceAppsJson = path.join(marketplaceAppsBasePath, modules.marketplace_apps.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export marketplace-apps', () => {
      describe('cm:stacks:export marketplace-apps [auth-token]', () => {
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
          .command(['cm:stacks:export', '--module', 'marketplace-apps', '--yes'])
          .it('Check marketplace-apps count', async () => {
            let exportedMarketplaceAppsCount = 0;
            const marketplaceAppsCount = await getMarketplaceAppsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(marketplaceAppsJson)) {
                exportedMarketplaceAppsCount = Object.keys(
                  JSON.parse(fs.readFileSync(marketplaceAppsJson, 'utf-8')),
                ).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(marketplaceAppsCount, exportedMarketplaceAppsCount);
          });
      });

      describe('cm:stacks:export marketplace-apps [management-token]', () => {
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
            'marketplace-apps',
            '--yes',
          ])
          .it('Check MarketplaceApps counts', async () => {
            let exportedMarketplaceAppsCount = 0;
            const marketplaceAppsCount = await getMarketplaceAppsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(marketplaceAppsJson)) {
                exportedMarketplaceAppsCount = Object.keys(
                  JSON.parse(fs.readFileSync(marketplaceAppsJson, 'utf-8')),
                ).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(marketplaceAppsCount, exportedMarketplaceAppsCount);
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
