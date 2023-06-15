/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const fs = require('fs');
const ncp = require('ncp');
const path = require('path');
const chalk = require('chalk');
const util = require('./lib/util/index');
const login = require('./lib/util/login');
const { addlogs } = require('./lib/util/log');
const { managementSDKClient, isAuthenticated } = require('@contentstack/cli-utilities');

exports.initial = (configData) => {
  return new Promise(async (resolve, reject) => {
    const config = util.initialization(configData);
    config.oldPath = config.data;
    const APIClient = await managementSDKClient(config);
    const stackAPIClient = APIClient.stack({ api_key: config.target_stack, management_token: config.management_token });

    if (configData.branchName) {
      await validateIfBranchExist(stackAPIClient, configData, configData.branchName).catch(() => {
        process.exit();
      });
    }

    const backupAndImportData = async (APIClient, stackAPIClient) => {
      if (fs.existsSync(config.data)) {
        let migrationBackupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
        return createBackup(migrationBackupDirPath, config)
          .then((basePath) => {
            config.data = basePath;
            return util.sanitizeStack(config);
          })
          .then(() => {
            let importRes;
            const types = config.modules.types;

            if (config.moduleName) {
              importRes = singleImport(APIClient, stackAPIClient, config.moduleName, types, config);
            } else {
              importRes = allImport(APIClient, stackAPIClient, config, types);
            }

            importRes.then(resolve).catch(reject);
          })
          .catch((error) => {
            addlogs(config, `Failed to import contents. ${util.formatError(error)}`, 'error');
            reject(error);
            process.exit(1);
          });
      } else {
        let filename = path.basename(config.data);
        addlogs(config, chalk.red(`'${filename}' Folder does not exist'`), 'error');
      }
    };

    if (config) {
      if (config.management_token || config.isAuthenticated) {
        await backupAndImportData(APIClient, stackAPIClient);
      } else if ((config.email && config.password) || isAuthenticated()) {
        login(config).then(backupAndImportData(APIClient, stackAPIClient)).catch(reject);
      } else if (config.email && config.password) {
        login(config)
          .then(backupAndImportData.apply(null, [APIClient, stackAPIClient]))
          .catch(reject);
      } else {
        reject('Kindly login or provide management_token');
      }
    }
  });
};

let singleImport = async (APIClient, stackAPIClient, moduleName, types, config) => {
  try {
    if (types.indexOf(moduleName) > -1) {
      if (!config.master_locale) {
        try {
          let masterLocalResponse = await util.masterLocalDetails(stackAPIClient);
          let master_locale = { code: masterLocalResponse.code };
          config['master_locale'] = master_locale;
        } catch (error) {
          addlogs(config, `Failed to get master locale detail from the stack ${util.formatError(error)}`, 'error');
        }
      }
      let ImportModule = require('./lib/import/' + moduleName);
      const importResponse = await new ImportModule(config, stackAPIClient, APIClient).start();
      if (moduleName === 'content-types') {
        let ctPath = path.resolve(config.data, config.modules.content_types.dirName);
        let fieldPath = path.join(ctPath + '/field_rules_uid.json');
        if (fieldPath) {
          await util.field_rules_update(config, ctPath);
        }
      }
      if (!(importResponse && importResponse.empty)) {
        addlogs(config, `Module '${moduleName}' imported successfully!`, 'success');
      }
      addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'success');
      return true;
    } else {
      addlogs(config, 'Please provide valid module name.', 'error');
    }
  } catch (error) {
    addlogs(config, `Failed to migrate '${moduleName}'`, 'error');
    addlogs(config, util.formatError(error), 'error');
    addlogs(config, `The log for this is stored at '${path.join(config.oldPath, 'logs', 'import')}'`, 'error');
  }
};

let allImport = async (APIClient, stackAPIClient, config, types) => {
  try {
    for (let i = 0; i < types.length; i++) {
      let type = types[i];
      if (i === 0 && !config.master_locale) {
        let masterLocalResponse = await util.masterLocalDetails(stackAPIClient);
        let master_locale = { code: masterLocalResponse.code };
        config['master_locale'] = master_locale;
      }
      let ImportModule = require('./lib/import/' + type);
      await new ImportModule(config, stackAPIClient, APIClient).start(config);
    }
    if (config.target_stack && config.source_stack) {
      addlogs(
        config,
        chalk.green(
          'The data of the ' +
            (config.sourceStackName || config.source_stack) +
            ' stack has been imported into ' +
            (config.destinationStackName || config.target_stack) +
            ' stack successfully!',
        ),
        'success',
      );
      addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'import'), 'success');
    } else {
      addlogs(
        config,
        chalk.green(
          'Data has been imported to stack ' + (config.destinationStackName || config.target_stack) + '  succesfully!',
        ),
        'success',
      );
      addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'success');
    }
    return true;
  } catch (error) {
    addlogs(
      config,
      `Failed to migrate stack '${(config.destinationStackName || config.target_stack)}'. Please check error logs for more info`,
      'error',
    );
    addlogs(config, util.formatError(error), 'error');
    addlogs(config, `The log for this is stored at '${path.join(config.oldPath, 'logs', 'import')}'`, 'error');
  }
};

const createBackup = (backupDirPath, config) => {
  return new Promise((resolve, reject) => {
    if (config.hasOwnProperty('useBackedupDir') && fs.existsSync(config.useBackedupDir)) {
      return resolve(config.useBackedupDir);
    }
    ncp.limit = config.backupConcurrency || 16;
    if (path.isAbsolute(config.data)) {
      return ncp(config.data, backupDirPath, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    } else {
      ncp(config.data, backupDirPath, (error) => {
        if (error) {
          return reject(error);
        }
        return resolve(backupDirPath);
      });
    }
  });
};

const validateIfBranchExist = async (stackAPIClient, config, branch) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await stackAPIClient
        .branch(branch)
        .fetch()
        .catch((_err) => {});
      if (data && typeof data === 'object') {
        if (data.error_message) {
          addlogs(config, data.error_message, 'error');
          addlogs(config, `No branch found with the name '${branch}`, 'error');
          reject({ message: 'No branch found with the name ' + branch, error: error_message });
        } else {
          resolve(data);
        }
      } else {
        reject({ message: 'No branch found with the name ' + branch, error: {} });
      }
    } catch (error) {
      addlogs(config, `No branch found with the name '${branch}`, 'error');
      reject({ message: 'No branch found with the name ' + branch, error });
    }
  });
};
