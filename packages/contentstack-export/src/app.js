/* eslint-disable no-redeclare */
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const util = require('./lib/util');
const login = require('./lib/util/login');
const setupBranches = require('./lib/util/setup-branches');
const { addlogs, unlinkFileLogger } = require('./lib/util/log');
const { managementSDKClient, isAuthenticated } = require('@contentstack/cli-utilities');

exports.initial = async (config) => {
  return new Promise(async (resolve, reject) => {
    config = util.buildAppConfig(config);
    util.validateConfig(config);
    exports.getConfig = () => {
      return config;
    };

    const APIClient = await managementSDKClient(config);
    const stackAPIClient = APIClient.stack({
      api_key: config.source_stack,
      management_token: config.management_token,
    });

    const fetchBranchAndExport = async (APIClient, stackAPIClient) => {
      await setupBranches(config, config.branchName, stackAPIClient);
      let types = config.modules.types;

      if (Array.isArray(config.branches) && config.branches.length > 0) {
        for (let branch of config.branches) {
          config.branchName = branch.uid;
          try {
            if (config.moduleName) {
              await singleExport(APIClient, stackAPIClient, config.moduleName, types, config, branch.uid);
            } else {
              await allExport(APIClient, stackAPIClient, config, types, branch.uid);
            }
          } catch (error) {
            addlogs(config, `failed export contents '${branch.uid}' ${util.formatError(error)}`, 'error');
          }
        }
      } else {
        try {
          if (config.moduleName) {
            await singleExport(APIClient, stackAPIClient, config.moduleName, types, config);
          } else {
            await allExport(APIClient, stackAPIClient, config, types);
          }
        } catch (error) {
          addlogs(config, `failed export contents. ${util.formatError(error)}`, 'error');
        }
      }
    };

    if (config.management_token || config.isAuthenticated) {
      try {
        await fetchBranchAndExport(APIClient, stackAPIClient);
      } catch (error) {
        addlogs(config, `${util.formatError(error)}`, 'error');
      }
      resolve();
    } else if (
      (config.email && config.password) ||
      (!config.email && !config.password && config.source_stack && config.access_token) ||
      (isAuthenticated() && !config.management_token)
    ) {
      login
        .login(config, APIClient, stackAPIClient)
        .then(async function () {
          // setup branches
          try {
            await fetchBranchAndExport(APIClient, stackAPIClient);
            unlinkFileLogger();
          } catch (error) {
            addlogs(config, `${util.formatError(error)}`, 'error');
          }
          resolve();
        })
        .catch((error) => {
          if (error && error.errors && error.errors.api_key) {
            addlogs(config, `Stack Api key '${error.errors.api_key[0]}', Please enter valid Key`, 'error');
            addlogs(config, 'The log for this is stored at ' + config.data + '/export/logs', 'success');
          } else {
            addlogs(config, `${util.formatError(error)}`, 'error');
          }
        });
    } else {
      reject('Kindly login or provide management_token');
    }
  });
};

const singleExport = async (APIClient, stackAPIClient, moduleName, types, config, branchName) => {
  try {
    if (types.indexOf(moduleName) > -1) {
      let iterateList;
      if (config.modules.dependency && config.modules.dependency[moduleName]) {
        iterateList = config.modules.dependency[moduleName];
      } else {
        iterateList = ['stack'];
      }
      iterateList.push(moduleName);

      for (let element of iterateList) {
        const ExportModule = require('./lib/export/' + element);
        const result = await new ExportModule(config, stackAPIClient, APIClient).start(config, branchName);
        if (result && element === 'stack') {
          let master_locale = {
            master_locale: { code: result.code },
          };
          config = _.merge(config, master_locale);
        }
      }
      addlogs(config, `Module '${moduleName}' was exported successfully!`, 'success');
      addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'success');
    } else {
      addlogs(config, 'Please provide valid module name.', 'error');
    }
    return true;
  } catch (error) {
    addlogs(config, `${util.formatError(error)}`, 'error');
    addlogs(config, `Failed to migrate module '${moduleName}'`, 'error');
    addlogs(config, `The log for this is stored at '${path.join(config.data, 'logs', 'export')}'`, 'error');
  }
};

const allExport = async (APIClient, stackAPIClient, config, types, branchName) => {
  try {
    for (let type of types) {
      const ExportModule = require('./lib/export/' + type);
      const result = await new ExportModule(config, stackAPIClient, APIClient).start(config, branchName);

      if (result && type === 'stack') {
        let master_locale = { master_locale: { code: result.code } };
        config = _.merge(config, master_locale);
      }
    }
    addlogs(
      config,
      chalk.green(
        'The content of stack ' + (config.sourceStackName || config.source_stack) + ' has been exported successfully!',
      ),
      'success',
    );
    addlogs(config, 'The log for this is stored at ' + path.join(config.data, 'logs', 'export'), 'success');
    return true;
  } catch (error) {
    addlogs(config, util.formatError(error), 'error');
    addlogs(
      config,
      `Failed to migrate stack '${config.sourceStackName || config.source_stack}'. Please check error logs for more info.`,
      'error',
    );
    addlogs(config, `The log for this is stored at '${path.join(config.data, 'logs', 'export')}'`, 'error');
  }
};
