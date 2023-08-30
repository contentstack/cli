const fs = require('fs');
const path = require('path');
const { test } = require('@oclif/test');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');

const { default: config } = require('../../lib/config');
const modules = config.modules;
const { getStackDetailsByRegion, getEnvironmentsCount, cleanUp, checkCounts } = require('./utils/helper');
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env;

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER);
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = stackDetails[stack].BRANCH
      ? path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`, stackDetails[stack].BRANCH)
      : path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`);
    const environmentsBasePath = path.join(exportBasePath, modules.environments.dirName);
    const environmentsJson = path.join(environmentsBasePath, modules.environments.fileName);

    describe('ContentStack-Export environments', () => {
      describe('cm:stacks:export environments [auth-token]', () => {
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
          .command(['cm:stacks:export', '--module', 'environments'])
          .it('Check environments count', async () => {
            let exportedEnvironmentsCount = 0;
            // change to environment
            const environmentsCount = await getEnvironmentsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(environmentsJson)) {
                exportedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(environmentsCount, exportedEnvironmentsCount);
          });
      });

      describe('cm:stacks:export environments [management-token]', () => {
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
            'environments',
          ])
          .it('Check environments count', async () => {
            let exportedEnvironmentsCount = 0;
            const environmentsCount = await getEnvironmentsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(environmentsJson)) {
                exportedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }

            checkCounts(environmentsCount, exportedEnvironmentsCount);
          });
      });

      afterEach(async () => {
        await cleanUp(path.join(__dirname, '..', '..', `${EXPORT_PATH}_${stack}`));
        config.management_token = undefined;
        config.branch = undefined;
        config.branches = [];
      });
    });
  }
};
