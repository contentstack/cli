const fs = require('fs');
const { promises: fsPromises } = fs;
const path = require('path');
const { expect, test } = require('@oclif/test');
const { test: customTest } = require('@contentstack/cli-dev-dependencies');
const { cliux: cliUX, messageHandler } = require('@contentstack/cli-utilities');
const LoginCommand = require('@contentstack/cli-auth/lib/commands/auth/login').default;
const AddTokenCommand = require('@contentstack/cli-auth/lib/commands/auth/tokens/add').default;
const RegionSetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default;

const { modules } = require('../../src/config/default');
const { getEnvData, getContentTypesCount, getEntriesCount } = require('./utils/helper');
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

  const contentTypesBasePath = path.join(importBasePath, modules.content_types.dirName);
  const entriesBasePath = path.join(importBasePath, modules.entries.dirName);
  const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');

  messageHandler.init({ messageFilePath });
  const { promptMessageList } = require(messageFilePath);

  describe('Contentstack-import NA plugin branch enabled test using mgmt token [--alias=common_mgmt_token]', () => {
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

    describe('Import complex stack using management token', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000) // NOTE: setting default as 10 minutes
        .stdout({ print: PRINT_LOGS || false })
        .stub(cliUX, 'prompt', async name => {
          switch (name) {
            case promptMessageList.promptPathStoredData:
              return importBasePath;
          }
        })
        .command(['cm:stacks:import', '-a', 'common_mgmt_token', '--branch', 'main'])
        .it('should work without any errors', async (_, done) => {
          done();
        });
    });

    describe('Check if all content-types are imported correctly', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000) // NOTE: setting default as 10 minutes
        .stdout({ print: PRINT_LOGS || false })
        .it('should check all content-types are imported', async (_, done) => {
          let importedContentTypesCount = 0;
          const contentTypesCount = await getContentTypesCount(stackDetails);

          try {
            if (fs.existsSync(contentTypesBasePath)) {
              let contentTypes = await fsPromises.readdir(contentTypesBasePath);
              importedContentTypesCount = contentTypes.filter(ct => !ct.includes('schema.json')).length;
            }
          } catch (error) {
            console.trace(error);
          }

          expect(contentTypesCount).to.be.an('number').eq(importedContentTypesCount);
          done();
        });
    });

    describe('Check if all entries are imported correctly', () => {
      test
        .timeout(DEFAULT_TIMEOUT || 600000) // NOTE: setting default as 10 minutes
        .stdout({ print: PRINT_LOGS || false })
        .it('should check all entries are imported', async (_, done) => {
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
  });
}

exec();