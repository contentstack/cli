const fs = require('fs');
const chalk = require('chalk');
module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const modules = ['entries', 'assets', 'extensions'];

  const readAllModulesUids = (filePath) => {
    let uidMapping = [];
    modules.forEach((module) => {
      if (fs.existsSync(`${filePath}/mapper/${module}/uid-mapping.json`)) {
        let mappedIds = fs.readFileSync(`${filePath}/mapper/${module}/uid-mapping.json`, 'utf-8');
        mappedIds = JSON.parse(mappedIds);
        uidMapping = { ...uidMapping, ...mappedIds };
      } else {
        console.log(chalk.red(`Mapper Does not exist for module '${module}'`));
      }
    });

    return uidMapping;
  };

  const getEntries = async (ct) => {
    try {
      let entries = [];
      let skip = 0;
      let limit = 1;
      let count = 0;
      while (skip <= count) {
        const res = await stackSDKInstance.contentType(ct).entry().query({ include_count: true, skip, limit }).find();
        count = res.count;
        skip += limit;
        entries = [...entries, ...res.items];
      }
      return entries;
    } catch (err) {
      console.log(err);
      console.log(chalk.red(`No entry is found for Content-type ${ct}`));
      return [];
    }
  };

  const getContentTypeSchema = async (ct) => {
    try {
      return await stackSDKInstance.contentType(ct).fetch();
    } catch (err) {
      console.log(chalk.red(`Content-type '${ct}' is not present in stack`));
      return {};
    }
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
            let { schema: ctSchema } = await getContentTypeSchema(ct);
            // console.log(ctSchema);
            if (!ctSchema) {
              continue;
            }

            let keys = ctSchema?.map((schema) => {
              return schema.uid;
            });

            let entry = await getEntries(ct);

            if (entry.length === 0) {
              log(chalk.red(`No entry found for the CT Content-type '${ct}'`));
              continue;
            }
            let uidMapping = readAllModulesUids(config['mapper-path']);

            for (let e of entry) {
              let isUpdated = false;

              let stringEntry = JSON.stringify(e);
              let pattern = /\bblt\w*/g;
              let matches = stringEntry.match(pattern);

              matches.forEach((m) => {
                if (Object.keys(uidMapping).includes(m)) {
                  let regex = new RegExp(m, 'g');
                  stringEntry = stringEntry.replace(regex, uidMapping[m]);
                  log(chalk.green(`Replacing UID '${m}' with '${uidMapping[m]}'`));
                  isUpdated = true;
                }
              });

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
