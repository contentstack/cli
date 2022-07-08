/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let fs = require('fs');
let ncp = require('ncp');
let _ = require('lodash');
let path = require('path');
const chalk = require('chalk');
let util = require('./lib/util/index');
let login = require('./lib/util/login');
let { addlogs } = require('./lib/util/log');

exports.initial = function (configData) {
  return new Promise(async function (resolve, reject) {
    let config = util.initialization(configData);
    config.oldPath = config.data;

    const backupAndImportData = async () => {
      if (fs.existsSync(config.data)) {
        let migrationBackupDirPath = path.join(process.cwd(), '_backup_' + Math.floor(Math.random() * 1000));
        return createBackup(migrationBackupDirPath, config)
          .then((basePath) => {
            config.data = basePath;
            return util.sanitizeStack(config);
          }).then(() => {
            let importRes
            const types = config.modules.types

            if (config.moduleName) {
              importRes = singleImport(config.moduleName, types, config)
                .catch(error => {
                  addlogs(`Error ${error && error.message}`);
                });
            } else {
              importRes = allImport(config, types)
                .catch(error => {
                  addlogs(`Error ${error && error.message}`);
                });
            }

            importRes
              .then(resolve)
              .catch(reject)
          }).catch((e) => {
            addlogs('Issue with import content backup creation.!')
            reject(e);
            process.exit(1);
          });
      } else {
        let filename = path.basename(config.data);
        addlogs(config, chalk.red(filename + ' Folder does not Exist'), 'error');
      }
    }

    if (config) {
      if (
        (config.email && config.password) ||
        (config.auth_token)
      ) {
        login(config)
          .then(backupAndImportData)
          .catch(reject);
      } else if (config.management_token) {
        await backupAndImportData()
      }
    }
  });
};

let singleImport = async (moduleName, types, config) => {
  return new Promise(async (resolve, reject) => {
    if (types.indexOf(moduleName) > -1) {
      if (!config.master_locale) {
        try {
          const masterLocalResponse = await util.masterLocalDetails(config)
            .catch(error => {
              addlogs(`Error ${error && error.message}`);
            });

          if (masterLocalResponse) {
            config['master_locale'] = { code: masterLocalResponse.code };
          }
        } catch (error) {
          console.log('Error to fetch the stack details' + error);
        }
      }

      let exportedModule = require('./lib/import/' + moduleName);
      exportedModule
        .start(config)
        .then(async function () {
          if (moduleName === 'content-types') {
            let ctPath = path.resolve(config.data, config.modules.content_types.dirName);
            let fieldPath = path.join(ctPath + '/field_rules_uid.json');
            if (fieldPath && fieldPath !== undefined) {
              await util.field_rules_update(config, ctPath);
            }
          }
          addlogs(config, moduleName + ' imported successfully!', 'success');
          addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'success');
          return resolve();
        })
        .catch(function (error) {
          addlogs(config, 'Failed to migrate ' + moduleName, 'error');
          addlogs(config, error, 'error');
          addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'error');
          return reject(error);
        });
    } else {
      addlogs(config, 'Please provide valid module name.', 'error');
      return reject();
    }
  });
};

let allImport = async (config, types) => {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < types.length; i++) {
        let type = types[i];
        var exportedModule = require('./lib/import/' + type);
        if (i === 0 && !config.master_locale) {
          const masterLocalResponse = await util.masterLocalDetails(config)
            .catch(error => {
              addlogs(`Error ${error && error.message}`);
            });

          if (masterLocalResponse) {
            config['master_locale'] = { code: masterLocalResponse.code };
          }
        }
        await exportedModule.start(config).then((_result) => {
          return;
        }).catch(function (error) {
          addlogs(config, 'Failed to migrate ' + type, 'error');
          addlogs(config, error, 'error');
          addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'error');
          return reject(error);
        });
      }
      if (config.target_stack && config.source_stack) {
        addlogs(
          config,
          chalk.green(
            'The data of the ' +
            config.sourceStackName +
            ' stack has been imported into ' +
            config.destinationStackName +
            ' stack successfully!',
          ),
          'success',
        );
        addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'import'), 'success');
      } else {
        addlogs(config, chalk.green('Stack: ' + config.target_stack + ' has been imported succesfully!'), 'success');
        addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'success');
      }
      return resolve();
    } catch (error) {
      addlogs(
        config,
        chalk.red('Failed to migrate stack: ' + config.target_stack + '. Please check error logs for more info'),
        'error',
      );
      addlogs(config, error, 'error');
      addlogs(config, 'The log for this is stored at ' + path.join(config.oldPath, 'logs', 'import'), 'error');
      return reject(error);
    }
  });
};

function createBackup(backupDirPath, config) {
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
}
