let fs = require('fs').promises;
let { existsSync } = require('fs');
let path = require('path');
let crypto = require('crypto');
let supportedLocales = require('./locales.json');
const { pathValidator, FsUtility, sanitizePath } = require('@contentstack/cli-utilities');

module.exports = async ({ migration, config }) => {
  let changeMasterLocale = {
    title: 'Change master locale for new structure',
    successMessage: 'Changed master locale successfully for the given data',
    failMessage: 'Failed to execute successfully',
    task: async (params) => {
      // Validate required config properties
      if (!config.data_dir) {
        throw new Error('config.data_dir is required but not provided');
      }
      if (!config.target_locale) {
        throw new Error('config.target_locale is required but not provided');
      }
      if (!supportedLocales[config.target_locale]) {
        throw new Error(
          'Please specify a supported language in config.json. For a list of all supported languages, refer to https://www.contentstack.com/docs/developers/multilingual-content/list-of-supported-languages',
        );
      }

      async function tailorData() {
        let locales = await fs.readFile(pathValidator(path.resolve(sanitizePath(config.data_dir), 'locales/locales.json')), 'utf-8');
        let masterLocale = await fs.readFile(
          pathValidator(path.resolve(sanitizePath(config.data_dir), 'locales/master-locale.json')),
          'utf-8',
        );

        if (masterLocale) {
          masterLocale = JSON.parse(masterLocale);
          masterLocale = Object.values(masterLocale);
          masterLocale = masterLocale[0]
          
          // Validate that we have a valid master locale code
          if (!masterLocale) {
            throw new Error('Unable to determine master locale code from master-locale.json');
          }
        }
        locales = JSON.parse(locales);
        let id = crypto.randomBytes(8).toString('hex');
        if (
          Object.values(locales)
            .map((locale) => locale.code)
            .includes(config.target_locale)
        ) {
          let targetLocaleUid = Object.keys(locales)
            .filter((uid) => locales[uid].code === config.target_locale)
            .pop();
          delete locales[targetLocaleUid];
        }
        locales[id] = {};
        locales[id].uid = id;
        locales[id].code = masterLocale;
        locales[id].name = supportedLocales[masterLocale];
        locales[id].fallback_locale = config.target_locale;

        await handleEntries(masterLocale);
        await fs.writeFile(
          pathValidator(path.resolve(sanitizePath(config.data_dir), 'locales/locales.json')),
          JSON.stringify(locales),
        );
        masterLocale = await fs.readFile(
          pathValidator(path.resolve(config.data_dir, 'locales/master-locale.json')),
          'utf-8',
        );
        masterLocale = JSON.parse(masterLocale);
        const uid = Object.keys(masterLocale);
        masterLocale[uid].code = config.target_locale;
        masterLocale[uid].name = supportedLocales[config.target_locale];
        await fs.writeFile(
          pathValidator(path.resolve(config.data_dir, 'locales/master-locale.json')),
          JSON.stringify(masterLocale),
        );
      }

      async function handleEntries(masterLocale) {
        let contentTypes = await fs.readdir(pathValidator(path.resolve(sanitizePath(config.data_dir), 'entries')));
        for (let contentType of contentTypes) {
          let sourceMasterLocaleEntries, targetMasterLocaleEntries;

          // Check if index.json exists (if no entries, index.json won't be created)
          const indexFilePath = pathValidator(path.resolve(sanitizePath(config.data_dir), sanitizePath(`entries/${contentType}/${masterLocale}/index.json`)));
          if (!existsSync(indexFilePath)) {
            console.log(`Skipping ${contentType} - no index.json found (likely no entries)`);
            continue;
          }

          sourceMasterLocaleEntries = await fs.readFile(
            indexFilePath,
            { encoding: 'utf8' },
          );

          // Parse the index.json to get the entries file name
          const indexData = JSON.parse(sourceMasterLocaleEntries);
          const entriesFileName = Object.values(indexData)[0];
          
          // Check if we have a valid entries file name
          if (!entriesFileName) {
            console.log(`Skipping ${contentType} - no entries file found in index.json`);
            continue;
          }

          const entriesFilePath = pathValidator(
            path.resolve(
              sanitizePath(config.data_dir),
              `entries/${sanitizePath(contentType)}/${sanitizePath(masterLocale)}/${entriesFileName}`,
            ),
          );

          sourceMasterLocaleEntries = await fs.readFile(
            entriesFilePath,
            { encoding: 'utf8' },
          );
          sourceMasterLocaleEntries = JSON.parse(sourceMasterLocaleEntries);
          if (
            existsSync(pathValidator(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}`)))
          ) {
            targetMasterLocaleEntries = await fs.readFile(
              pathValidator(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}/index.json`)),
              { encoding: 'utf8', flag: 'a+' },
            );
            if (targetMasterLocaleEntries) {
              const targetIndexData = JSON.parse(targetMasterLocaleEntries);
              const targetEntriesFileName = Object.values(targetIndexData)[0];
              
              if (targetEntriesFileName) {
                targetMasterLocaleEntries = await fs.readFile(
                  pathValidator(
                    path.resolve(
                      config.data_dir,
                      `entries/${contentType}/${config.target_locale}/${targetEntriesFileName}`,
                    ),
                  ),
                  { encoding: 'utf8' },
                );
                targetMasterLocaleEntries = JSON.parse(targetMasterLocaleEntries);
              } else {
                targetMasterLocaleEntries = {};
              }
            } else {
              targetMasterLocaleEntries = {};
            }
          } else {
            targetMasterLocaleEntries = {};
          }

          Object.keys(sourceMasterLocaleEntries).forEach((uid) => {
            if (!targetMasterLocaleEntries[uid]) {
              targetMasterLocaleEntries[uid] = JSON.parse(JSON.stringify(sourceMasterLocaleEntries[uid]));
              delete targetMasterLocaleEntries[uid]['publish_details'];
              targetMasterLocaleEntries[uid].locale = config.target_locale;
            }
          });

          if (
            existsSync(pathValidator(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}`)))
          ) {
            let exsitingTargetMasterLocalEntries = await fs.readFile(
              pathValidator(path.resolve(config.data_dir, `entries/${contentType}/${config.target_locale}/index.json`)),
              { encoding: 'utf8', flag: 'a+' },
            );
            
            const existingIndexData = JSON.parse(exsitingTargetMasterLocalEntries);
            const existingEntriesFileName = Object.values(existingIndexData)[0];
            
            if (existingEntriesFileName) {
              await fs.writeFile(
                pathValidator(
                  path.resolve(
                    config.data_dir,
                    `entries/${contentType}/${config.target_locale}/${existingEntriesFileName}`,
                  ),
                ),
                JSON.stringify(targetMasterLocaleEntries),
              );
            }
          } else {
            const entryBasePath = path.join(config.data_dir, `entries`, contentType, config.target_locale);
            let entriesFileHelper = new FsUtility({
              moduleName: 'entries',
              indexFileName: 'index.json',
              basePath: entryBasePath,
              chunkFileSize: 5,
              keepMetadata: false,
            });
            entriesFileHelper.writeIntoFile(targetMasterLocaleEntries, { mapKeyVal: true });
            entriesFileHelper?.completeFile(true);
          }
        }
      }

      await tailorData();
    },
  };
  migration.addTask(changeMasterLocale);
};
