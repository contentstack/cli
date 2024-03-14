const fs = require('fs');
const path = require('path');
const uniqBy = require('lodash/uniqBy');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../lib/config');
const modules = config.modules;
const { getStackDetailsByRegion, getAssetAndFolderCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const assetsBasePath = path.join(exportBasePath, modules.assets.dirName);
    const assetsFolderPath = path.join(assetsBasePath, 'folders.json');
    const assetsJson = path.join(assetsBasePath, modules.assets.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export assets', () => {
      describe('cm:stacks:export assets [auth-token]', () => {
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
          .command(['cm:stacks:export', '--module', 'assets'])
          .it('Check assets and folders counts', async () => {
            let exportedAssetsCount = 0;
            let exportedAssetsFolderCount = 0;
            const { assetCount, folderCount } = await getAssetAndFolderCount(stackDetails[stack]);

            try {
              if (fs.existsSync(assetsFolderPath)) {
                exportedAssetsFolderCount = uniqBy(
                  JSON.parse(fs.readFileSync(assetsFolderPath, 'utf-8')),
                  'uid',
                ).length;
              }
              if (fs.existsSync(assetsJson)) {
                exportedAssetsCount = Object.keys(JSON.parse(fs.readFileSync(assetsJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(assetCount, exportedAssetsCount);
            checkCounts(folderCount, exportedAssetsFolderCount);
          });
      });

      describe('cm:stacks:export assets [management-token]', () => {
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
            'assets',
          ])
          .it('Check assets and folder counts', async () => {
            let exportedAssetsCount = 0;
            let exportedAssetsFolderCount = 0;
            const { assetCount, folderCount } = await getAssetAndFolderCount(stackDetails[stack]);

            try {
              if (fs.existsSync(assetsFolderPath)) {
                exportedAssetsFolderCount = uniqBy(
                  JSON.parse(fs.readFileSync(assetsFolderPath, 'utf-8')),
                  'uid',
                ).length;
              }
              if (fs.existsSync(assetsJson)) {
                exportedAssetsCount = Object.keys(JSON.parse(fs.readFileSync(assetsJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(assetCount, exportedAssetsCount);
            checkCounts(folderCount, exportedAssetsFolderCount);
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
