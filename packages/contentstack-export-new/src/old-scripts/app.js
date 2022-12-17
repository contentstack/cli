/* eslint-disable no-redeclare */
const _ = require("lodash");
const path = require("path");
const chalk = require("chalk");
const util = require("./lib/util");
const { formatError } = require("./lib/util");
const login = require("./lib/util/login");
const setupBranches = require("./lib/util/setup-branches");
const { addlogs, unlinkFileLogger } = require("./lib/util/log");
const stack = require("./lib/util/contentstack-management-sdk");

exports.initial = async function (config) {
  return new Promise(async function (resolve, reject) {
    config = util.buildAppConfig(config);
    util.validateConfig(config);
    exports.getConfig = function () {
      return config;
    };

    const fetchBranchAndExport = async () => {
      await setupBranches(config, config.branchName);
      let types = config.modules.types;

      if (Array.isArray(config.branches) && config.branches.length > 0) {
        for (let branch of config.branches) {
          config.branchName = branch.uid;
          try {
            if (config.moduleName) {
              await singleExport(config.moduleName, types, config, branch.uid);
            } else {
              await allExport(config, types, branch.uid);
            }
          } catch (error) {
            addlogs(
              config,
              `failed export contents ${branch.uid} ${formatError(error)}`,
              "error"
            );
          }
        }
      } else {
        try {
          if (config.moduleName) {
            await singleExport(config.moduleName, types, config);
          } else {
            await allExport(config, types);
          }
        } catch (error) {
          addlogs(
            config,
            `failed export contents ${formatError(error)}`,
            "error"
          );
        }
      }
    };

    // try {
    if (
      (config.email && config.password) ||
      (!config.email &&
        !config.password &&
        config.source_stack &&
        config.access_token) ||
      (config.auth_token && !config.management_token)
    ) {
      login
        .login(config)
        .then(async function () {
          // setup branches
          try {
            await fetchBranchAndExport();
            unlinkFileLogger();
          } catch (error) {
            addlogs(config, `${formatError(error)}`, "error");
          }
          resolve();
        })
        .catch((error) => {
          console.log("error", error && error.message);
          if (error && error.errors && error.errors.api_key) {
            addlogs(
              config,
              chalk.red(
                "Stack Api key " + error.errors.api_key[0],
                "Please enter valid Key",
                "error"
              )
            );
            addlogs(
              config,
              "The log for this is stored at " + config.data + "/export/logs",
              "success"
            );
          } else {
            addlogs(config, `${formatError(error)}`, "error");
          }
        });
    } else if (config.management_token) {
      try {
        await fetchBranchAndExport();
      } catch (error) {
        addlogs(config, formatError(error), "error");
      }
      resolve();
    }
  });
};

const singleExport = async (moduleName, types, config, branchName) => {
  try {
    const stackClient = stack.Client(config).stack({
      api_key: config.source_stack,
      management_token: config.management_token,
    });
    if (types.indexOf(moduleName) > -1) {
      let iterateList;
      if (config.modules.dependency && config.modules.dependency[moduleName]) {
        iterateList = config.modules.dependency[moduleName];
      } else {
        iterateList = ["stack"];
      }
      iterateList.push(moduleName);

      for (let element of iterateList) {
        const ExportModule = require("./lib/export/" + element);
        const result = await new ExportModule(config, stackClient).start(
          config,
          branchName
        );
        if (result && element === "stack") {
          let master_locale = {
            master_locale: { code: result.code },
          };
          config = _.merge(config, master_locale);
        }
      }
      addlogs(config, moduleName + " was exported successfully!", "success");
      addlogs(
        config,
        "The log for this is stored at " +
          path.join(config.data, "logs", "export"),
        "success"
      );
    } else {
      addlogs(config, "Please provide valid module name.", "error");
    }
    return true;
  } catch (error) {
    addlogs(config, `${formatError(error)}`, "error");
    addlogs(config, "Failed to migrate " + moduleName, "error");
    addlogs(
      config,
      "The log for this is stored at " +
        path.join(config.data, "logs", "export"),
      "error"
    );
  }
};

const allExport = async (config, types, branchName) => {
  try {
    const stackClient = stack.Client(config).stack({
      api_key: config.source_stack,
      management_token: config.management_token,
    });

    for (let type of types) {
      const ExportModule = require("./lib/export/" + type);
      const result = await new ExportModule(config, stackClient).start(
        config,
        branchName
      );

      if (result && type === "stack") {
        let master_locale = { master_locale: { code: result.code } };
        config = _.merge(config, master_locale);
      }
    }
    addlogs(
      config,
      chalk.green(
        "The content of stack " +
          (config.sourceStackName || config.source_stack) +
          " has been exported successfully!"
      ),
      "success"
    );
    addlogs(
      config,
      "The log for this is stored at " +
        path.join(config.data, "logs", "export"),
      "success"
    );
    return true;
  } catch (error) {
    addlogs(config, formatError(error), "error");
    addlogs(
      config,
      chalk.red(
        "Failed to migrate stack: " +
          config.source_stack +
          ". Please check error logs for more info"
      ),
      "error"
    );
    addlogs(
      config,
      "The log for this is stored at " +
        path.join(config.data, "logs", "export"),
      "error"
    );
  }
};
