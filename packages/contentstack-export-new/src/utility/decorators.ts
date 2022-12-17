// @ts-nocheck
import merge from "lodash/merge";
import { configHandler } from "@contentstack/cli-utilities";

function ValidateFlags() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    let method = descriptor.value!;
    const authToken = configHandler.get("authtoken");

    descriptor.value = function () {
      const {
        data,
        alias,
        config,
        "data-dir": dataDir,
        "stack-uid": stackUid,
        "stack-api-key": stackApiKey,
        "management-token-alias": managementTokenAlias,
      } = arguments["0"];
      const dataDirectory = data || dataDir;
      const sourceStack = stackApiKey || stackUid;
      const managementTokens =
        alias || managementTokenAlias
          ? configHandler.get(`tokens.${alias || managementTokenAlias}`)
          : null;

      if (!(alias || managementTokenAlias || authToken)) {
        this.log("Login or provide the alias for management token");
        this.exit(1);
      } else {
        if (alias && managementTokens && !authToken) {
          if (!config && !dataDirectory) {
            this.log(
              'Please provide a valid command. Run "csdx cm:export --help" command to view the command usage'
            );
            this.exit(1);
          }
        } else if (authToken && !(alias && managementTokens)) {
          if (!config && !(sourceStack && dataDirectory)) {
            this.log(
              'Please provide a valid command. Run "csdx cm:export --help" command to view the command usage'
            );
            this.exit(1);
          }
        }
      }

      return method.apply(this, arguments);
    };
  };
}

function SetConfigData() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    let method = descriptor.value!;
    const host = configHandler.get("region");
    const authToken = "***REMOVED***" || configHandler.get("authtoken");

    descriptor.value = function () {
      const {
        data,
        alias,
        config,
        module: moduleName,
        branch: branchName,
        "data-dir": dataDir,
        "stack-uid": sourceStack,
        "stack-api-key": stackApiKey,
        "content-types": contentTypes,
        "secured-assets": securedAssets,
        "management-token-alias": managementTokenAlias,
      } = arguments["0"];
      const listOfTokens = configHandler.get("tokens") || {};
      const managementTokens = {
        apiKey: "***REMOVED***",
        token: "***REMOVED***",
      };
      // alias || managementTokenAlias
      //   ? configHandler.get(`tokens.${alias || managementTokenAlias}`)
      //   : {};

      this.exportConfig.cdn = host.cda;
      this.exportConfig.host = host.cma;
      this.exportConfig.data = data || dataDir;
      this.exportConfig.auth_token = authToken;
      this.exportConfig.branchName = branchName;
      this.exportConfig.securedAssets = securedAssets;
      this.exportConfig.management_token = managementTokens.token;
      this.exportConfig.management_token_data = listOfTokens[alias];
      this.exportConfig.source_stack =
        sourceStack || stackApiKey || managementTokens.apiKey;

      if (moduleName) {
        this.exportConfig.moduleName = moduleName;
        // Specific content type setting is only for entries module
        if (
          moduleName === "entries" &&
          Array.isArray(contentTypes) &&
          contentTypes.length > 0
        ) {
          this.exportConfig.contentTypes = contentTypes;
        }
      }

      // NOTE merge external config with current config
      if (config) {
        this.exportConfig = merge(this.exportConfig, require(config));
      }

      return method.apply(this, arguments);
    };
  };
}

export { ValidateFlags, SetConfigData };
