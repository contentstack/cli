const fs = require('fs');
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../lib/config');
const modules = config.modules;
const { getStackDetailsByRegion, getLabelsCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);

    const labelBasePath = path.join(exportBasePath, modules.labels.dirName);
    const labelJson = path.join(labelBasePath, modules.labels.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
    messageHandler.init({ messageFilePath });
    const { promptMessageList } = require(messageFilePath);

    describe('ContentStack-Export labels', () => {
      describe('cm:stacks:export labels [auth-token]', () => {
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
          .command(['cm:stacks:export', '--module', 'labels'])
          .it('Check label counts', async () => {
            let exportedLabelsCount = 0;
            const labelsCount = await getLabelsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(labelJson)) {
                exportedLabelsCount = Object.keys(JSON.parse(fs.readFileSync(labelJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(labelsCount, exportedLabelsCount);
          });
      });

      describe('cm:stacks:export labels [management-token]', () => {
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
            'labels',
          ])
          .it('Check label counts', async () => {
            let exportedLabelsCount = 0;
            const labelsCount = await getLabelsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(labelJson)) {
                exportedLabelsCount = Object.keys(JSON.parse(fs.readFileSync(labelJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }
            checkCounts(labelsCount, exportedLabelsCount);
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
