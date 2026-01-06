/* eslint-disable no-unused-expressions */
/* eslint-disable no-warning-comments */
/* eslint-disable camelcase */
'use strict';

// Dependencies
const Listr = require('listr');
const { resolve, extname } = require('path');
const { Command } = require('@contentstack/cli-command');
const { waterfall } = require('async');
const { Parser } = require('../../../modules');
const { ActionList } = require('../../../actions');
const fs = require('fs');
const chalk = require('chalk');
const isEmpty = require('lodash/isEmpty');
const {
  managementSDKClient,
  flags,
  isAuthenticated,
  pathValidator,
  sanitizePath,
} = require('@contentstack/cli-utilities');

const { ApiError, SchemaValidator, MigrationError, FieldValidator } = require('../../../validators');

// Utils
const { map: _map, constants, safePromise, errorHelper, installModules } = require('../../../utils');
// Properties
const { get, set, getMapInstance, resetMapInstance } = _map;
const {
  requests: _requests,
  actionMapper,
  MANAGEMENT_SDK,
  MANAGEMENT_TOKEN,
  AUTH_TOKEN,
  API_KEY,
  BRANCH,
  MANAGEMENT_CLIENT,
} = constants;

class MigrationCommand extends Command {
  static examples = [
    '$ csdx cm:migration --file-path <migration/script/file/path> -k <api-key>',
    '$ csdx cm:migration --file-path <migration/script/file/path> -k <api-key> --branch <target branch name>',
    '$ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... --file-path <migration/script/file/path>',
    '$ csdx cm:migration --config-file <path/to/json/config/file> --file-path <migration/script/file/path>',
    '$ csdx cm:migration --multiple --file-path <migration/scripts/dir/path> ',
    '$ csdx cm:migration --alias --file-path <migration/script/file/path> -k <api-key>',
  ];

  async run() {
    // TODO: filePath validation required.
    const { flags: migrationCommandFlags } = await this.parse(MigrationCommand);
    const { branch } = migrationCommandFlags || {};
    const filePath = migrationCommandFlags['file-path'];
    const multi = migrationCommandFlags.multiple;
    const authtoken = isAuthenticated();
    const apiKey = migrationCommandFlags['stack-api-key'];
    const alias = migrationCommandFlags['alias'];
    const config = migrationCommandFlags['config'];

    if (!authtoken && !alias) {
      this.log(
        "AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login or provide management token alias",
      );
      this.exit();
    }

    if (!filePath || !fs.existsSync(filePath)) {
      this.log('Please provide the migration script file path, use --file-path flag');
      this.exit();
    }

    // Reset map instance
    const mapInstance = getMapInstance();
    resetMapInstance(mapInstance);
    if (migrationCommandFlags['config-file']) {
      set('config-path', mapInstance, migrationCommandFlags['config-file']);
    }

    if (Array.isArray(config) && config.length > 0) {
      let configObj = config.reduce((a, v) => {
        //NOTE: Temp code to handle only one spilt(Window absolute path issue).Need to replace with hardcoded config key
        let [key, ...value] = v.split(':');
        value = value?.length > 1 ? value?.join(':') : value?.join();
        return { ...a, [key]: value };
      }, {});
      set('config', mapInstance, configObj);
    }

    const APIClient = await managementSDKClient({ host: this.cmaHost });
    let stackSDKInstance;
    if (branch) {
      set(BRANCH, mapInstance, branch);
    }

    if (alias) {
      let managementToken = this.getToken(alias);
      if (managementToken) {
        set(MANAGEMENT_TOKEN, mapInstance, managementToken);
        set(API_KEY, mapInstance, managementToken.apiKey);
        if (branch) {
          stackSDKInstance = APIClient.stack({
            management_token: managementToken.token,
            api_key: managementToken.apiKey,
            branch_uid: branch,
          });
        } else {
          stackSDKInstance = APIClient.stack({
            management_token: managementToken.token,
            api_key: managementToken.apiKey,
          });
        }
      }
    } else if (authtoken) {
      set(AUTH_TOKEN, mapInstance, authtoken);
      set(API_KEY, mapInstance, apiKey);
      if (branch) {
        stackSDKInstance = APIClient.stack({
          api_key: apiKey,
          branch_uid: branch,
        });
      } else {
        stackSDKInstance = APIClient.stack({ api_key: apiKey });
      }
    }

    set(MANAGEMENT_SDK, mapInstance, stackSDKInstance);
    set(MANAGEMENT_CLIENT, mapInstance, APIClient);

    if (!(await installModules(filePath, multi))) {
      this.log(`Error: Failed to install dependencies for the specified scripts.`);
      process.exit(1);
    }

    if (multi) {
      await this.execMultiFiles(filePath, mapInstance);
    } else {
      await this.execSingleFile(filePath, mapInstance);
    }
    const errLogPath = `${process.cwd()}/migration-logs`;
    if (fs.existsSync(errLogPath)) {
      this.log(`The log has been stored at: `, errLogPath);
    }
  }

  async execSingleFile(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = pathValidator(filePath);
    // User provided migration function
    const migrationFunc = require(resolvedMigrationPath);

    const parser = new Parser();

    try {
      const migrationParser = await parser.getMigrationParser(migrationFunc);
      if (migrationParser.hasErrors) {
        errorHelper(migrationParser.hasErrors);
        // When the process is child, send error message to parent
        if (process.send) process.send({ errorOccurred: true });
        this.exit(1);
      }

      // Make calls from here
      const requests = get(_requests, mapInstance);
      // Fetches tasks array
      const tasks = this.getTasks(requests);

      const listr = new Listr(tasks);

      await listr.run();
      requests.splice(0, requests.length);
    } catch (error) {
      errorHelper(error, filePath);
      if (process.send) process.send({ errorOccurred: true });
    }
  }

  async execMultiFiles(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = pathValidator(filePath);
    try {
      const files = fs.readdirSync(resolvedMigrationPath);
      for (const element of files) {
        const file = element;
        if (extname(file) === '.js') {
          // eslint-disable-next-line no-await-in-loop
          await this.execSingleFile(pathValidator(resolve(sanitizePath(filePath), sanitizePath(file))), mapInstance);
        }
      }
    } catch (error) {
      errorHelper(error);
    }
  }

  getTasks(requests) {
    const _tasks = [];
    const results = [];

    const taskFn = (reqObj) => {
      const { failedTitle, successTitle, tasks } = reqObj;

      return async (ctx, task) => {
        const [err, result] = await safePromise(waterfall(tasks));
        if (err) {
          ctx.error = true;
          task.title = failedTitle;
          throw err;
        }
        result && results.push(result);
        task.title = successTitle;
        return result;
      };
    };

    for (const element of requests) {
      let reqObj = element;
      const { title } = reqObj;
      const taskObj = {
        title: title,
        task: taskFn(reqObj),
      };
      _tasks.push(taskObj);
    }
    return _tasks;
  }

  handleErrors() {
    const mapInstance = getMapInstance();
    const actions = get(actionMapper, mapInstance);
    const actionList = new ActionList(actions);

    actionList.addValidators(new ApiError());
    actionList.addValidators(new SchemaValidator());
    actionList.addValidators(new MigrationError());
    actionList.addValidators(new FieldValidator());

    const errors = actionList.validate();
    errorHelper(errors);
  }
}

MigrationCommand.description = 'Contentstack migration script.';

MigrationCommand.flags = {
  'stack-api-key': flags.string({
    char: 'k',
    description: 'Use this flag to add the API key of your stack. You must use either the --stack-api-key flag or the --alias flag.',
    exclusive: ['alias'],
  }),
  alias: flags.string({
    char: 'a',
    description: 'Use this flag to add the management token alias. You must use either the --alias flag or the --stack-api-key flag.',
  }),
  'file-path': flags.string({
    description: 'Use this flag to provide the path of the file of the migration script.',
  }),
  branch: flags.string({
    description: 'Use this flag to add the branch name where you want to perform the migration. (target branch name)',
  }),
  'config-file': flags.string({
    description: '[optional] Path of the JSON configuration file.',
  }),
  config: flags.string({
    description: '[optional] Inline configuration, <key1>:<value1>. Passing an external configuration makes the script re-usable.',
    multiple: true,
  }),
  multiple: flags.boolean({
    description: 'This flag helps you to migrate multiple content files in a single instance. Mention the folder path where your migration script files are stored.',
  }),
};

MigrationCommand.aliases = ['cm:migration'];

MigrationCommand.usage =
  'cm:stacks:migration [-k <value>] [-a <value>] [--file-path <value>] [--branch <value>] [--config-file <value>] [--config <value>] [--multiple]';

module.exports = MigrationCommand;
