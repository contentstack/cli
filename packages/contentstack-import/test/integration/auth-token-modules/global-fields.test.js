const fs = require('fs');
const path = require('path');
const { expect, test } = require('@oclif/test');
const { test: customTest } = require('@contentstack/cli-dev-dependencies');
const { messageHandler } = require('@contentstack/cli-utilities');
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default;
const RegionSetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default;
const ExportCommand = require('@contentstack/cli-cm-export/src/commands/cm/stacks/export');

const { default: defaultConfig } = require('../../../src/config');
const modules = defaultConfig.modules;
const { getStackDetailsByRegion, cleanUp, getEnvData, getGlobalFieldsCount } = require('../utils/helper');
const { PRINT_LOGS, IMPORT_PATH } = require('../config.json');
const { DELIMITER, KEY_VAL_DELIMITER } = process.env;
const { ENCRYPTION_KEY } = getEnvData();

const REGION_MAP = {
  NA: 'NA',
  NA_AZ: 'AZURE-NA',
  EU_AZ: 'AZURE-EU',
  EU: 'EU',
};

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region.REGION, DELIMITER, KEY_VAL_DELIMITER);
  for (const stack of Object.keys(stackDetails)) {
    const basePath = path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`);
    const importBasePath = path.join(basePath, stackDetails[stack].BRANCH ? stackDetails[stack].BRANCH : 'main');
    const globalFieldsBasePath = path.join(importBasePath, modules.globalfields.dirName);
    const globalFieldsJson = path.join(globalFieldsBasePath, modules.globalfields.fileName);
    const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
    messageHandler.init({ messageFilePath });
    const username = ENCRYPTION_KEY ? crypto.decrypt(region.USERNAME) : region.USERNAME;
    const password = ENCRYPTION_KEY ? crypto.decrypt(region.PASSWORD) : region.PASSWORD;

    describe('Contentstack-import plugin test [--module=global-fields]', () => {
      customTest
        .stdout({ print: PRINT_LOGS || false })
        .command(RegionSetCommand, [REGION_MAP[stackDetails[stack].REGION_NAME]])
        .command(LoginCommand, [`-u=${username}`, `-p=${password}`])
        .it('should work without any errors', (_, done) => {
          done();
        });

      customTest
        .stdout({ print: PRINT_LOGS || false })
        .command(ExportCommand, [
          '--alias',
          '--stack-api-key',
          stackDetails[stack].EXPORT_STACK_API_KEY,
          '--data-dir',
          basePath,
          '--module',
          'global-fields',
        ])
        .it('should work without any errors', (_, done) => {
          done();
        });

      describe('Import assets using cm:stacks:import command', () => {
        test
          .stdout({ print: PRINT_LOGS || false })
          .command([
            'cm:stacks:import',
            '--stack-api-key',
            stackDetails[stack].STACK_API_KEY,
            '--data-dir',
            importBasePath,
            '--module',
            'global-fields',
          ])
          .it('should work without any errors', async (_, done) => {
            let importedGlobalFieldsCount = 0;
            const globalFieldsCount = await getGlobalFieldsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(globalFieldsJson)) {
                importedGlobalFieldsCount = Object.keys(JSON.parse(fs.readFileSync(globalFieldsJson, 'utf-8'))).length;
              }
            } catch (error) {
              console.trace(error);
            }

            expect(globalFieldsCount).to.be.an('number').eq(importedGlobalFieldsCount);
            done();
          });
      });

      after(async () => {
        await cleanUp(path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`));
        defaultConfig.management_token = null;
        defaultConfig.branch = null;
        defaultConfig.branches = [];
        defaultConfig.moduleName = null;
      });
    });
  }
};
