let fs = require('fs');
let { existsSync } = require('fs');
let path = require('path');
let crypto = require('crypto');
const { pathValidator, FsUtility, sanitizePath } = require('@contentstack/cli-utilities');

module.exports = async ({ migration, config }) => {
  let updateEnvironments = {
    title: 'Update Environments into the entries of the Stack',
    successMessage: 'Environments of the Entries are Updated',
    failMessage: 'Failed to execute successfully',
    task: async (params) => {
      let envMapper = {};
      function checkWritePermissionToDirectory(directory) {
        try {
          fs.accessSync(directory, fs.constants.W_OK);
          return true;
        } catch (err) {
          console.log(`Permission Denied! You do not have the necessary write access for this directory.`);
          return false;
        }
      }

      async function verifySourceAndDestinationStackData() {
        try {
          let source =
            fs.existsSync(`${config.source_stack_exported_data_path}/entries`) &&
            fs.existsSync(`${config.source_stack_exported_data_path}/environments`);
          let destination =
            fs.existsSync(`${config.destination_stack_exported_data_path}/entries`) &&
            fs.existsSync(`${config.destination_stack_exported_data_path}/environments`);

          if (!source || !destination) {
            throw new Error(`The Source or Destination Directory Path are not valid`);
          } else {
            console.log(`You have permission to write to directory`);
          }
        } catch (err) {
          console.log(
            `The 'environments' or 'entries' folder doesn't exist either in source or destination stack. Please Check!`,
          );
          throw err;
        }
      }

      async function createEnvironmentUidMapper() {
        try {
          let sourceEnv = Object.values(
            JSON.parse(
              fs.readFileSync(`${config.source_stack_exported_data_path}/environments/environments.json`, 'utf-8'),
            ),
          );
          let destinationEnv = Object.values(
            JSON.parse(
              fs.readFileSync(`${config.destination_stack_exported_data_path}/environments/environments.json`, 'utf-8'),
            ),
          );

          for (const [sourceName, destName] of Object.entries(config.environmentMapping)) {
            const sourceUid = sourceEnv.find((env) => env.name === sourceName)?.uid;
            const destUid = destinationEnv.find((env) => env.name === destName)?.uid;

            if (sourceUid && destUid) {
              envMapper[sourceUid] = destUid;
            } else {
              console.log(`No Mapper Provided for the environment ${sourceName} or ${destName}`);
            }
          }
        } catch (err) {
          throw err;
        }
      }

      async function readAndUpdateEntries() {
        let ctUidSource = Object.values(
          JSON.parse(
            fs.readFileSync(
              path.join(`${sanitizePath(config.source_stack_exported_data_path)}/content_types/schema.json`),
              'utf-8',
            ),
          ),
        ).map((ct) => ct.uid);

        let sourceLocale = Object.values(
          JSON.parse(
            fs.readFileSync(
              path.join(`${sanitizePath(config.source_stack_exported_data_path)}/locales/locales.json`),
              'utf-8',
            ),
          ),
        ).map((locale) => locale.code);
        let sourceMasterLocale = Object.values(
          JSON.parse(
            fs.readFileSync(
              path.join(`${sanitizePath(config.source_stack_exported_data_path)}/locales/master-locale.json`),
              'utf-8',
            ),
          ),
        ).map((locale) => locale.code);
        let locales = [...sourceLocale, ...sourceMasterLocale];

        for (let ct of ctUidSource) {
          for (let locale of locales) {
            let sourceEntries;
            if (
              existsSync(pathValidator(path.resolve(config.source_stack_exported_data_path, `entries/${ct}/${locale}`)))
            ) {
              sourceEntries = fs.readFileSync(
                pathValidator(
                  path.resolve(config.source_stack_exported_data_path, `entries/${ct}/${locale}/index.json`),
                ),
                'utf-8',
              );
              if (sourceEntries) {
                sourceEntries = await fs.readFileSync(
                  pathValidator(
                    path.resolve(
                      config.source_stack_exported_data_path,
                      `entries/${ct}/${locale}/${Object.values(JSON.parse(sourceEntries))[0]}`,
                    ),
                  ),
                  'utf8',
                );
                sourceEntries = JSON.parse(sourceEntries);

                Object.keys(sourceEntries).forEach((entry) => {
                  sourceEntries[entry].publish_details = sourceEntries[entry].publish_details?.map((details) => {
                    details.environment = envMapper[details.environment];
                    return details;
                  });
                  let existingEntries = fs.readFileSync(
                    pathValidator(
                      path.resolve(config.source_stack_exported_data_path, `entries/${ct}/${locale}/index.json`),
                    ),
                    { encoding: 'utf8', flag: 'a+' },
                  );
                  fs.writeFileSync(
                    pathValidator(
                      path.resolve(
                        config.source_stack_exported_data_path,
                        `entries/${ct}/${locale}/${Object.values(JSON.parse(existingEntries))[0]}`,
                      ),
                    ),
                    JSON.stringify(sourceEntries, null, 2),
                  );
                });
              } else {
                console.log(`No Entries Exist for Content-type ${ct} in loclae ${locale}`);
              }
            }
          }
        }
      }

      async function start() {
        try {
          if (await checkWritePermissionToDirectory(config.source_stack_exported_data_path)) {
            await verifySourceAndDestinationStackData();
            await createEnvironmentUidMapper();
            await readAndUpdateEntries();
          }
        } catch (err) {
          throw err;
        }
      }

      await start();
    },
  };
  migration.addTask(updateEnvironments);
};
