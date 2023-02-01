const fs = require('fs');
const { promises: fsPromises } = fs;
const path = require('path');
const { expect, test } = require('@oclif/test');
const { test: customTest } = require('@contentstack/cli-dev-dependencies');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');
const { uniqBy } = require('lodash');
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default;
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const RegionSetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default;

const { modules } = require('../../src/config/default');
const {
  getContentTypesCount,
  getEntriesCount,
  getLocalesCount,
  getEnvironmentsCount,
  getAssetAndFolderCount,
  getWebhooksCount,
  getGlobalFieldsCount,
  getExtensionsCount,
  getWorkflowsCount,
  getCustomRolesCount,
  getEnvData,
} = require('./utils/helper');
const { PRINT_LOGS, IMPORT_PATH, DEFAULT_TIMEOUT } = require('./config.json');
const { getStackDetails } = require('./init.test');
const { NA_USERNAME: USERNAME, NA_PASSWORD: PASSWORD } = getEnvData();

async function exec() {
  const __stackDetails = getStackDetails();
  const stack = Object.keys(__stackDetails).find(el => !el.includes('EU') && !el.includes('NA_AZ'));
  const stackDetails = __stackDetails[stack];

  const importBasePath = stackDetails.BRANCH
    ? path.join(`${IMPORT_PATH}_${stack}`, stackDetails.BRANCH || 'main')
    : path.join(`${IMPORT_PATH}_${stack}`);
  const assetsBasePath = path.join(importBasePath, modules.assets.dirName);

  const contentTypesBasePath = path.join(importBasePath, modules.content_types.dirName);
  const entriesBasePath = path.join(importBasePath, modules.entries.dirName);
  const localeBasePath = path.join(importBasePath, modules.locales.dirName);
  const localeJson = path.join(localeBasePath, modules.locales.fileName);
  const environmentsBasePath = path.join(importBasePath, modules.environments.dirName);
  const environmentsJson = path.join(environmentsBasePath, modules.environments.fileName);
  const assetsFolderPath = path.join(assetsBasePath, 'folders.json');
  const assetsJson = path.join(assetsBasePath, modules.assets.fileName);
  const webhooksBasePath = path.join(importBasePath, modules.webhooks.dirName);
  const webhooksJson = path.join(webhooksBasePath, modules.webhooks.fileName);
  const globalFieldsBasePath = path.join(importBasePath, modules.globalfields.dirName);
  const globalFieldsJson = path.join(globalFieldsBasePath, modules.globalfields.fileName);
  const extensionsBasePath = path.join(importBasePath, modules.extensions.dirName);
  const extensionsJson = path.join(extensionsBasePath, modules.extensions.fileName);
  const customRolesBasePath = path.join(importBasePath, modules.customRoles.dirName);
  const customRolesJson = path.join(customRolesBasePath, modules.customRoles.fileName);
  const workflowsBasePath = path.join(importBasePath, modules.workflows.dirName);
  const workflowsJson = path.join(workflowsBasePath, modules.workflows.fileName);
  const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

  messageHandler.init({ messageFilePath });
  const { promptMessageList } = require(messageFilePath);

  describe('Contentstack-import plugin module-wise test using mgmt token', () => {
    customTest
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE: setting default as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(RegionSetCommand, ['NA'])
      .command(LoginCommand, [`-u=${USERNAME}`, `-p=${PASSWORD}`])
      .it('should work without any errors', (_, done) => {
        done();
      });

    customTest
      .timeout(DEFAULT_TIMEOUT || 600000)
      .command(AddTokenCommand, ['-a', stackDetails.ALIAS_NAME, '-k', stackDetails.STACK_API_KEY, '--management', '--token', stackDetails.MANAGEMENT_TOKEN, '-y'])
      .it(`Adding token for ${stack}`, (_, done) => {
        done();
      });

    describe('Import content-types using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'content-types'])
        .it('should work without any errors', async (_, done) => {
          let importedContentTypesCount = 0;
          const contentTypesCount = await getContentTypesCount(stackDetails);

          try {
            if (fs.existsSync(contentTypesBasePath)) {
              let contentTypes = await fsPromises.readdir(contentTypesBasePath);
              importedContentTypesCount = contentTypes.filter(ct => !ct.includes('schema.json')).length;
            }
          } catch (error) {
            console.trace(error)
          }

          expect(contentTypesCount).to.be.an('number').eq(importedContentTypesCount)
          done();
        });
    });

    describe('Import entries using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'entries'])
        .it('should work without any errors', async (_, done) => {
          let importedEntriesCount = 0;
          const entriesCount = await getEntriesCount(stackDetails);

          try {
            if (fs.existsSync(entriesBasePath)) {
              let contentTypes = await fsPromises.readdir(entriesBasePath);
              for (let contentType of contentTypes) {
                let ctPath = path.join(entriesBasePath, contentType);
                let locales = await fsPromises.readdir(ctPath);
                for (let locale of locales) {
                  let entries = await fsPromises.readFile(path.join(ctPath, locale), 'utf-8');
                  importedEntriesCount += Object.keys(JSON.parse(entries)).length;
                }
              }
            }
          } catch (error) {
            console.trace(error);
          }

          expect(entriesCount).to.be.an('number').eq(importedEntriesCount);
          done();
        });
    });

    describe('Import locales using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'locales'])
        .it('should work without any errors', async (_, done) => {
          let importedLocaleCount = 0;
          const localeCount = await getLocalesCount(stackDetails);

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

    describe('Import environments using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'environments'])
        .it('should work without any errors', async (_, done) => {
          let importedEnvironmentsCount = 0;
          const environmentsCount = await getEnvironmentsCount(stackDetails);

          try {
            if (fs.existsSync(environmentsJson)) {
              importedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(environmentsCount).to.be.an('number').eq(importedEnvironmentsCount);
          done();
        });
    });

    describe('Import assets using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'assets'])
        .it('should work without any errors', async (_, done) => {
          let importedAssetsCount = 0;
          let importedAssetsFolderCount = 0;
          const { assetCount, folderCount } = await getAssetAndFolderCount(stackDetails);

          try {
            if (fs.existsSync(assetsFolderPath)) {
              importedAssetsFolderCount = uniqBy(JSON.parse(fs.readFileSync(assetsFolderPath, 'utf-8')), 'uid').length;
            }
            if (fs.existsSync(assetsJson)) {
              importedAssetsCount = Object.keys(JSON.parse(fs.readFileSync(assetsJson, 'utf-8'))).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(assetCount).to.be.an('number').eq(importedAssetsCount);
          expect(folderCount).to.be.an('number').eq(importedAssetsFolderCount);
          done();
        });
    });

    describe('Import webhooks using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'webhooks'])
        .it('should work without any errors', async (_, done) => {
          let importedWebhooksCount = 0;
          const webhooksCount = await getWebhooksCount(stackDetails);

          try {
            if (fs.existsSync(webhooksJson)) {
              importedWebhooksCount = Object.keys(JSON.parse(fs.readFileSync(webhooksJson, 'utf-8'))).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(webhooksCount).to.be.an('number').eq(importedWebhooksCount);
          done();
        });
    });

    describe('Import workflows using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'workflows'])
        .it('should work without any errors', async (_, done) => {
          let importedWorkflowsCount = 0
          const workflowsCount = await getWorkflowsCount(stackDetails)

          try {
            if (fs.existsSync(workflowsJson)) {
              importedWorkflowsCount = Object.keys(JSON.parse(fs.readFileSync(workflowsJson, 'utf-8'))).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(workflowsCount).to.be.an('number').eq(importedWorkflowsCount);
          done();
        });
    });

    describe('Import global fields using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'global-fields'])
        .it('should work without any errors', async (_, done) => {
          let importedGlobalFieldsCount = 0;
          const globalFieldsCount = await getGlobalFieldsCount(stackDetails);

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

    describe('Import extensions using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'extensions'])
        .it('should work without any errors', async (_, done) => {
          let importedExtensionsCount = 0;
          const extensionsCount = await getExtensionsCount(stackDetails);

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

    describe('Import custom-roles using mgmt token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000)
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main', '--module', 'custom-roles'])
        .it('should work without any errors', async (_, done) => {
          let importedCustomRolesCount = 0;
          const customRolesCount = await getCustomRolesCount(stackDetails);

          try {
            if (fs.existsSync(customRolesJson)) {
              importedCustomRolesCount = Object.keys(JSON.parse(fs.readFileSync(customRolesJson, 'utf-8'))).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(customRolesCount).to.be.an('number').eq(importedCustomRolesCount);
          done();
        });
    });
  });
}

exec();