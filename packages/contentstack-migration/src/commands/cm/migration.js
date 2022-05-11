/* eslint-disable no-unused-expressions */
/* eslint-disable no-warning-comments */
/* eslint-disable camelcase */
"use strict";

// Dependencies
const Listr = require("listr");
const { resolve, extname } = require("path");
const { Command, flags } = require("@contentstack/cli-command");
const { waterfall } = require("async");
const { Parser } = require("../../modules");
const { ActionList } = require("../../actions");
const fs = require("fs");
const chalk = require("chalk");

const {
  ApiError,
  SchemaValidator,
  MigrationError,
  FieldValidator,
} = require("../../validators");

// Utils
const {
  map: _map,
  constants,
  safePromise,
  errorHelper,
} = require("../../utils");
const { success } = require("../../utils/logger");

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
    "$ csdx cm:migration -A -n <migration/script/file/path> -k <api-key>",
    "$ csdx cm:migration -A -n <migration/script/file/path> -k <api-key> -B <target branch name>",
    "$ csdx cm:migration --config <key1>:<value1> <key2>:<value2> ... -n <migration/script/file/path>",
    "$ csdx cm:migration --config-file <path/to/json/config/file> -n <migration/script/file/path>",
    "$ csdx cm:migration --multi -n <migration/scripts/dir/path> ",
    "$ csdx cm:migration -a -n <migration/script/file/path> -k <api-key>",
  ];

  async run() {
    // TODO: filePath validation required.
    const migrationCommandFlags = this.parse(MigrationCommand).flags;
    const { filePath, multi, branch } = migrationCommandFlags;
    const authtoken = migrationCommandFlags.authtoken;
    const apiKey = migrationCommandFlags["api-key"];
    const alias = migrationCommandFlags["management-token-alias"];
    const config = migrationCommandFlags["config"];

    if (!filePath) {
      this.log("Please provide the migration script file path, use -n or --filePath flag");
      this.exit();
    }

    // Reset map instance
    const mapInstance = getMapInstance();
    resetMapInstance(mapInstance);
    if (migrationCommandFlags["config-file"]) {
      set("config-path", mapInstance, migrationCommandFlags["config-file"]);
    }

    if (Array.isArray(config) && config.length > 0) {
      let configObj = config.reduce((a, v) => {
        let objArr = v.split(":");
        return { ...a, [objArr[0]]: objArr[1] };
      }, {});
      set("config", mapInstance, configObj);
    }

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
          stackSDKInstance = this.managementAPIClient.stack({
            management_token: managementToken.token,
            api_key: managementToken.apiKey,
            branch_uid: branch,
          });
        } else {
          stackSDKInstance = this.managementAPIClient.stack({
            management_token: managementToken.token,
            api_key: managementToken.apiKey,
          });
        }
      }
    }

    if (authtoken) {
      set(AUTH_TOKEN, mapInstance, authtoken);
      set(API_KEY, mapInstance, apiKey);
      this.managementAPIClient = { authtoken: this.authToken };
      if (branch) {
        stackSDKInstance = this.managementAPIClient.stack({
          api_key: apiKey,
          branch_uid: branch,
        });
      } else {
        stackSDKInstance = this.managementAPIClient.stack({ api_key: apiKey });
      }
    }

    set(MANAGEMENT_SDK, mapInstance, stackSDKInstance);
    set(MANAGEMENT_CLIENT, mapInstance, this.managementAPIClient);

    if (multi) {
      await this.execMultiFiles(filePath, mapInstance);
    } else {
      await this.execSingleFile(filePath, mapInstance);
    }
  }

  async execSingleFile(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath);
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

      await listr.run().catch((error) => {
        this.handleErrors(error);
        // When the process is child, send error message to parent
        if (process.send) process.send({ errorOccurred: true });
      });
      requests.splice(0, requests.length);
    } catch (error) {
      // errorHandler(null, null, null, error)
    }
  }

  async execMultiFiles(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath);
    try {
      const files = fs.readdirSync(resolvedMigrationPath);
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        if (extname(file) === ".js") {
          success(chalk`{white Executing file:} {grey {bold ${file}}}`);
          // eslint-disable-next-line no-await-in-loop
          await this.execSingleFile(resolve(filePath, file), mapInstance);
        }
      }
    } catch (error) {
      error(error);
    }
  }

  getTasks(requests) {
    const _tasks = [];
    const results = [];

    for (let i = 0; i < requests.length; i++) {
      let reqObj = requests[i];
      const { title, failedTitle, successTitle, tasks } = reqObj;
      const task = {
        title: title,
        task: async (ctx, task) => {
          const [err, result] = await safePromise(waterfall(tasks));
          if (err) {
            ctx.error = true;
            task.title = failedTitle;
            throw err;
          }
          result && results.push(result);
          task.title = successTitle;
          return result;
        },
      };
      _tasks.push(task);
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

MigrationCommand.description = "Contentstack migration script.";

MigrationCommand.flags = {
  "api-key": flags.string({
    char: "k",
    description: "With this flag add the API key of your stack.",
    dependsOn: ["authtoken"],
    exclusive: ["management-token-alias"],
  }),
  authtoken: flags.boolean({
    char: "A",
    description:
      "Use this flag to use the auth token of the current session. After logging in CLI, an auth token is generated for each new session.",
    dependsOn: ["api-key"],
    exclusive: ["management-token-alias"],
  }),
  "management-token-alias": flags.string({
    char: "a",
    description: "Use this flag to add the management token alias.",
    exclusive: ["authtoken"],
  }), // Add a better description
  filePath: flags.string({
    char: "n",
    description:
      "Use this flag to provide the path of the file of the migration script provided by the user.",
  }),
  branch: flags.string({
    char: "B",
    description:
      "Use this flag to add the branch name where you want to perform the migration.",
  }),
  "config-file": flags.string({
    description: "[optional] Path of the JSON configuration file",
  }),
  config: flags.string({
    description: "[optional] inline configuration, <key1>:<value1>",
    multiple: true,
  }),
  multi: flags.boolean({
    description:
      "This flag helps you to migrate multiple content files in a single instance.",
  }), // Add a better description
};

module.exports = MigrationCommand;
