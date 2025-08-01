const fs = require('fs');
const path = require('path');
const { expect, test } = require('@oclif/test');
const { test: customTest } = require('@contentstack/cli-dev-dependencies');
const { messageHandler } = require('@contentstack/cli-utilities');
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default;
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const RegionSetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default;
const ExportCommand = require('@contentstack/cli-cm-export/src/commands/cm/stacks/export');

const { default: defaultConfig } = require('../../src/config');
const modules = defaultConfig.modules;
const { getStackDetailsByRegion, cleanUp, deleteStack, getEnvData, getExtensionsCount } = require('./utils/helper');
const { PRINT_LOGS, IMPORT_PATH, REGION_MAP } = require('./config.json');
const { DELIMITER, KEY_VAL_DELIMITER } = process.env;
const { ENCRYPTION_KEY } = getEnvData();

module.exports = (region) => {
    const stackDetails = getStackDetailsByRegion(region.REGION, DELIMITER, KEY_VAL_DELIMITER);
    for (const stack of Object.keys(stackDetails)) {
        const basePath = path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`);
        const importBasePath = path.join(basePath, stackDetails[stack].BRANCH ? stackDetails[stack].BRANCH : 'main');
        const extensionsBasePath = path.join(importBasePath, modules.extensions.dirName);
        const extensionsJson = path.join(extensionsBasePath, modules.extensions.fileName);
        const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
        messageHandler.init({ messageFilePath });
        const username = ENCRYPTION_KEY ? crypto.decrypt(region.USERNAME) : region.USERNAME;
        const password = ENCRYPTION_KEY ? crypto.decrypt(region.PASSWORD) : region.PASSWORD;

        describe('Contentstack-import plugin test [--module=extensions]', () => {
            customTest
                .stdout({ print: PRINT_LOGS || false })
                .command(RegionSetCommand, [REGION_MAP[stackDetails[stack].REGION_NAME]])
                .command(LoginCommand, [`-u=${username}`, `-p=${password}`])
                .it('should work without any errors', (_, done) => {
                    done();
                });

            customTest
                .command(AddTokenCommand, [
                    '-a',
                    stackDetails[stack].EXPORT_ALIAS_NAME,
                    '-k',
                    stackDetails[stack].EXPORT_STACK_API_KEY,
                    '--management',
                    '--token',
                    stackDetails[stack].EXPORT_MANAGEMENT_TOKEN,
                    '-y',
                ])
                .it(`Adding token for ${stack}`, (_, done) => {
                    done();
                });

            customTest
                .command(AddTokenCommand, [
                    '-a',
                    stackDetails[stack].ALIAS_NAME,
                    '-k',
                    stackDetails[stack].STACK_API_KEY,
                    '--management',
                    '--token',
                    stackDetails[stack].MANAGEMENT_TOKEN,
                    '-y',
                ])
                .it(`Adding token for ${stack}`, (_, done) => {
                    done();
                });

            customTest
                .stdout({ print: PRINT_LOGS || false })
                .command(ExportCommand, [
                    '--alias',
                    stackDetails[stack].EXPORT_ALIAS_NAME,
                    '--data-dir',
                    basePath,
                    '--module',
                    'extensions',
                ])
                .it('should work without any errors', (_, done) => {
                    done();
                });

            describe('Import assets using cm:stacks:import command', () => {
                test
                    .stdout({ print: PRINT_LOGS || false })
                    .command([
                        'cm:stacks:import',
                        '--alias',
                        stackDetails[stack].ALIAS_NAME,
                        '--data-dir',
                        importBasePath,
                        '--module',
                        'extensions',
                    ])
                    .it('should work without any errors', async (_, done) => {
                        let importedExtensionsCount = 0;
                        const extensionsCount = await getExtensionsCount(stackDetails[stack]);

                        try {
                            if (fs.existsSync(extensionsJson)) {
                                importedExtensionsCount = Object.keys(JSON.parse(fs.readFileSync(extensionsJson, 'utf-8'))).length;
                            }
                        } catch (error) {
                            console.trace(error);
                        }

                        expect(extensionsCount).to.be.an('number').eq(importedExtensionsCount);
                        done();
                    });
            });

            after(async () => {
                await cleanUp(path.join(__dirname, '..', '..', `${IMPORT_PATH}_${stack}`));
                // await deleteStack({ apiKey: stackDetails[stack].STACK_API_KEY, authToken: configHandler.get('authtoken') });
                defaultConfig.management_token = null;
                defaultConfig.branch = null;
                defaultConfig.branches = [];
                defaultConfig.moduleName = null;
            });
        });
    }
};
