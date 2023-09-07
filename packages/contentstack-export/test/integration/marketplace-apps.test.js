const fs = require('fs');
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX } = require('@contentstack/cli-utilities');

const { default: config } = require('../../lib/config');
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

    describe('ContentStack-Export marketplace-apps', () => {
      describe('cm:stacks:export marketplace-apps [auth-token]', () => {
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
      config.management_token = undefined;
      config.branch = undefined;
      config.branches = [];
    });
  }
};
