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
const { getStackDetailsByRegion, cleanUp, getEnvData, getLocalesCount } = require('../utils/helper');
const { PRINT_LOGS, IMPORT_PATH, REGION_MAP } = require('../config.json');
const { DELIMITER, KEY_VAL_DELIMITER } = process.env;
const { ENCRYPTION_KEY } = getEnvData();

module.exports = (region) => {
    const stackDetails = getStackDetailsByRegion(region.REGION, DELIMITER, KEY_VAL_DELIMITER);
    for (const stack of Object.keys(stackDetails)) {
        const basePath = path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`);
        const importBasePath = path.join(basePath, stackDetails[stack].BRANCH ? stackDetails[stack].BRANCH : 'main');
        const localeBasePath = path.join(importBasePath, modules.locales.dirName);
        const localeJson = path.join(localeBasePath, modules.locales.fileName);
        const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
        messageHandler.init({ messageFilePath });
        const username = ENCRYPTION_KEY ? crypto.decrypt(region.USERNAME) : region.USERNAME;
        const password = ENCRYPTION_KEY ? crypto.decrypt(region.PASSWORD) : region.PASSWORD;

        describe('Contentstack-import plugin test [--module=locales]', () => {
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
                    '--stack-api-key',
                    stackDetails[stack].EXPORT_STACK_API_KEY,
                    '--data-dir',
                    basePath,
                    '--module',
                    'locales',
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
                        'locales',
                    ])
                    .it('should work without any errors', async (_, done) => {
                        let importedLocaleCount = 0;
                        const localeCount = await getLocalesCount(stackDetails[stack]);

                        try {
                            if (fs.existsSync(localeJson)) {
                                importedLocaleCount = Object.keys(JSON.parse(fs.readFileSync(localeJson, 'utf-8'))).length;
                            }
                        } catch (error) {
                            console.trace(error);
                        }

                        expect(localeCount).to.be.an('number').eq(importedLocaleCount);
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
