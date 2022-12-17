import { Command, flags } from "@contentstack/cli-command";

import {
  configWithMToken,
  parameterWithMToken,
  configWithAuthToken,
  withoutParameterMToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken,
} from "./lib/util/export-flags";
import config from "@/config/default";
import { configHandler } from "@contentstack/cli-utilities";
import { printFlagDeprecation } from "@contentstack/cli-utilities";

export class OldExportCommand extends Command {
  static flags = {
    config: flags.string({
      char: "c",
      description: "[optional] path of the config",
    }),
    "stack-uid": flags.string({
      char: "s",
      description: "API key of the source stack",
      hidden: true,
      parse: printFlagDeprecation(
        ["-s", "--stack-uid"],
        ["-k", "--stack-api-key"]
      ),
    }),
    "stack-api-key": flags.string({
      char: "k",
      description: "API key of the source stack",
    }),
    data: flags.string({
      description: "path or location to store the data",
      hidden: true,
      parse: printFlagDeprecation(["--data"], ["--data-dir"]),
    }),
    "data-dir": flags.string({
      char: "d",
      description: "path or location to store the data",
    }),
    alias: flags.string({
      char: "a",
      description: "alias of the management token",
    }),
    "management-token-alias": flags.string({
      description: "alias of the management token",
      hidden: true,
      parse: printFlagDeprecation(
        ["--management-token-alias"],
        ["-a", "--alias"]
      ),
    }),
    "auth-token": flags.boolean({
      char: "A",
      description: "to use auth token",
      hidden: true,
      parse: printFlagDeprecation(["-A", "--auth-token"]),
    }),
    module: flags.string({
      char: "m",
      description: "[optional] specific module name",
      exclusive: ["content-types"],
      parse: printFlagDeprecation(["-m"], ["--module"]),
    }),
    "content-types": flags.string({
      char: "t",
      description: "[optional] content type",
      multiple: true,
      exclusive: ["module"],
      parse: printFlagDeprecation(["-t"], ["--content-types"]),
    }),
    branch: flags.string({
      char: "B",
      // default: 'main',
      description: "[optional] branch name",
      parse: printFlagDeprecation(["-B"], ["--branch"]),
    }),
    "secured-assets": flags.boolean({
      description: "[optional] use when assets are secured",
    }),
    yes: flags.boolean({
      char: "y",
      required: false,
      description: "[optional] Override marketplace apps related prompts",
    }),
  };

  async run() {
    const { flags: exportCommandFlags } = await this.parse(OldExportCommand);
    const extConfig = exportCommandFlags.config;
    let sourceStack =
      exportCommandFlags["stack-uid"] || exportCommandFlags["stack-api-key"];
    const alias =
      exportCommandFlags["alias"] ||
      exportCommandFlags["management-token-alias"];
    const securedAssets = exportCommandFlags["secured-assets"];
    const data = exportCommandFlags.data || exportCommandFlags["data-dir"];
    const moduleName = exportCommandFlags.module;
    const contentTypes = exportCommandFlags["content-types"];
    const branchName = exportCommandFlags.branch;
    let _authToken = configHandler.get("authtoken");
    let host = this.region;
    let cmaHost = host.cma.split("//");
    let cdaHost = host.cda.split("//");
    host.cma = cmaHost[1];
    host.cda = cdaHost[1];

    config.forceStopMarketplaceAppsPrompt = exportCommandFlags.yes;

    if (alias) {
      const listOfTokens = configHandler.get("tokens");
      const managementTokens = configHandler.get(`tokens.${alias}`);
      config.management_token_data = listOfTokens[alias];

      if (managementTokens) {
        if (extConfig) {
          await configWithMToken(
            extConfig,
            managementTokens,
            host,
            contentTypes,
            branchName,
            securedAssets,
            moduleName
          );
        } else if (data) {
          await parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            _authToken,
            contentTypes,
            branchName,
            securedAssets
          );
        } else if (data === undefined && sourceStack === undefined) {
          await withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            _authToken,
            contentTypes,
            branchName,
            securedAssets
          );
        } else {
          this.log(
            'Please provide a valid command. Run "csdx cm:export --help" command to view the command usage'
          );
        }
      } else {
        this.log(
          alias +
            " management token is not present, please add managment token first"
        );
      }
    } else if (_authToken) {
      if (extConfig) {
        await configWithAuthToken(
          extConfig,
          _authToken,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        );
      } else if (sourceStack && data) {
        return await parametersWithAuthToken(
          _authToken,
          sourceStack,
          data,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        );
      } else if (data === undefined && sourceStack === undefined) {
        await withoutParametersWithAuthToken(
          _authToken,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        );
      } else {
        this.log(
          'Please provide a valid command. Run "csdx cm:export --help" command to view the command usage'
        );
      }
    } else {
      this.log("Login or provide the alias for management token");
    }
  }
}
