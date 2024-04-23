const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const modules = ['entries', 'assets', 'extensions', 'marketplace_apps'];

  const readAllModulesUids = (filePath) => {
    let uidMapping = {};

    modules.forEach((module) => {
      const mappingFilePath = path.join(filePath, 'mapper', module, 'uid-mapping.json');
      if (fs.existsSync(mappingFilePath)) {
        const mappedIds = JSON.parse(fs.readFileSync(mappingFilePath, 'utf-8'));

        if (module === 'marketplace_apps') {
          Object.values(mappedIds).forEach((ids) => Object.assign(uidMapping, ids));
        } else {
          Object.assign(uidMapping, mappedIds);
        }
      }
    });

    return uidMapping;
  };

  const getEntries = async (ct) => {
    try {
      let entries = [];
      let skip = 0;
      let limit = 100;
      let count = 0;
      while (skip <= count) {
        const res = await stackSDKInstance.contentType(ct).entry().query({ include_count: true, skip, limit }).find();
        count = res.count;
        skip += limit;
        entries.push(...res.items);
      }
      return entries;
    } catch (err) {
      console.log(chalk.red(`Cannot Fetch Entries`));
      throw err;
    }
  };

  const getContentTypeSchema = async (ct) => {
    try {
      return await stackSDKInstance.contentType(ct).fetch();
    } catch (err) {
      console.log(chalk.red(`Error in Fetching the Content-type '${ct}' due to ${err.errorMessage}`));
    }
  };

  const findAllEntriesUid = (stringifiedEntry) => {
    let pattern = /\bblt\w*/g;
    let matches = stringifiedEntry.match(pattern);
    return matches;
  };

  const replaceEntriesWithUpdatedUids = (matches, uidMapping, stringifiedEntry) => {
    let isUpdated = false;
    let oldUids = Object.keys(uidMapping);
    matches.forEach((m) => {
      if (oldUids.includes(m)) {
        let regex = new RegExp(m, 'g');
        stringifiedEntry = stringifiedEntry.replace(regex, uidMapping[m]);
        console.log(chalk.green(`Replacing UID '${m}' with '${uidMapping[m]}'`));
        isUpdated = true;
      }
    });
    return { stringifiedEntry, isUpdated };
  };

  const updateEntryTask = () => {
    return {
      title: 'Update Reference Entries from Mapper',
      successMessage: 'Reference Updated Successfully',
      failedMessage: 'Failed to Update References in Entries',
      task: async (params) => {
        try {
          const log = console.log;

          if ((!config.contentTypes && !Array.isArray(config.contentTypes)) || !config['mapper-path']) {
            throw Error(
              `Content-type or the Mapper Path is missing from the config. Please provide Content-type in Array and mapper path`,
            );
          }

          for (let ct of config.contentTypes) {
            let { schema: ctSchema } = (await getContentTypeSchema(ct)) ?? {};

            if (!ctSchema) {
              continue;
            }

            let keys = ctSchema?.map((schema) => {
              return schema.uid;
            });

            let entry = (await getEntries(ct)) ?? [];

            if (entry.length === 0) {
              log(chalk.red(`No entry found for the CT Content-type '${ct}'`));
              continue;
            }
            let uidMapping = readAllModulesUids(config['mapper-path']);

            for (let e of entry) {
              let isUpdated = false;

              let stringEntry = JSON.stringify(e);

              let matches = findAllEntriesUid(stringEntry);

              let res = replaceEntriesWithUpdatedUids(matches, uidMapping, stringEntry);

              stringEntry = res.stringifiedEntry;
              isUpdated = res.isUpdated;

              stringEntry = JSON.parse(stringEntry);

              keys.forEach((k) => {
                if (stringEntry[k]) {
                  e[k] = stringEntry[k];
                }
              });

              if (isUpdated) {
                await e.update(e.locale);

                log(
                  chalk.green(
                    `Updated the References in Entry with UID '${e.uid}' and title '${e.title}' in locale '${e.locale}' of content-type '${ct}'`,
                  ),
                );
              } else {
                log(
                  chalk.red(
                    `Not Updated the Entry with UID '${e.uid}' and title '${e.title}' in locale '${e.locale}' of content-type '${ct}'`,
                  ),
                );
              }
            }
            log(chalk.green(`Updated the entries of CT '${ct}'`));
          }
        } catch (err) {
          if (err.request?.headers) {
            delete err.request['headers'];
          }
          console.log(chalk.red(`References not updated`));
          throw err;
        }
      },
    };
  };

  migration.addTask(updateEntryTask());
};
