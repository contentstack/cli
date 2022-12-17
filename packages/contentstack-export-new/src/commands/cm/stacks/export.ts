import map from "lodash/map";
import keys from "lodash/keys";
import { Command, Flags } from "@oclif/core";
import { printFlagDeprecation } from "@contentstack/cli-utilities";

import config from "@/config/default";
import { ExportAssets } from "./module";
import { OldExportCommand } from "@/old-scripts/export";
import { SetConfigData, ValidateFlags } from "@/utility";

type MapModule = {
  stack: string;
  assets: typeof ExportAssets;
  locale: string;
  locales: string;
  environments: string;
  extensions: string;
  webhooks: string;
  globalFields: string;
  contentTypes: string;
  customRoles: string;
  workflows: string;
  entries: string;
  labels: string;
  marketplaceApps: string;
};

export class ExportCommand extends Command {
  public exportConfig = config;
  readonly exportMapping: MapModule = {
    stack: "upcoming...",
    assets: ExportAssets,
    locale: "upcoming...",
    locales: "upcoming...",
    environments: "upcoming...",
    extensions: "upcoming...",
    webhooks: "upcoming...",
    globalFields: "upcoming...",
    contentTypes: "upcoming...",
    customRoles: "upcoming...",
    workflows: "upcoming...",
    entries: "upcoming...",
    labels: "upcoming...",
    marketplaceApps: "upcoming...",
  };

  static description = "Export content from a stack";

  // custom usage string for help
  // this overrides the default usage
  static usage =
    "<%= config.bin %> <%= command.id %> [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets] --yes";

  // examples to add to help
  // <%= config.bin %> resolves to the executable name
  // <%= command.id %> resolves to the command name
  static examples = [
    "<%= config.bin %> <%= command.id %> --help",
    "<%= config.bin %> <%= command.id %> --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>",
    "<%= config.bin %> <%= command.id %> --config <path/to/config/dir>",
    "<%= config.bin %> <%= command.id %> --alias <management_token_alias>",
    "<%= config.bin %> <%= command.id %> --alias <management_token_alias> --data-dir <path/to/export/destination/dir>",
    "<%= config.bin %> <%= command.id %> --alias <management_token_alias> --config <path/to/config/file>",
    "<%= config.bin %> <%= command.id %> --module <single module name>",
    "<%= config.bin %> <%= command.id %> --branch [optional] branch name",
    "<%= config.bin %> <%= command.id %> --yes",
  ];

  // define aliases that can execute this command.
  static aliases = ["cm:stacks:export"];

  static flags = {
    config: Flags.string({
      char: "c",
      description: "[optional] path of the config",
    }),
    "stack-uid": Flags.string({
      char: "s",
      description: "API key of the source stack",
      hidden: true,
      parse: printFlagDeprecation(
        ["-s", "--stack-uid"],
        ["-k", "--stack-api-key"]
      ),
    }),
    "stack-api-key": Flags.string({
      char: "k",
      description: "API key of the source stack",
    }),
    data: Flags.string({
      description: "path or location to store the data",
      hidden: true,
      parse: printFlagDeprecation(["--data"], ["--data-dir"]),
    }),
    "data-dir": Flags.string({
      char: "d",
      description: "path or location to store the data",
    }),
    alias: Flags.string({
      char: "a",
      description: "alias of the management token",
    }),
    "management-token-alias": Flags.string({
      description: "alias of the management token",
      hidden: true,
      parse: printFlagDeprecation(
        ["--management-token-alias"],
        ["-a", "--alias"]
      ),
    }),
    "auth-token": Flags.boolean({
      char: "A",
      description: "to use auth token",
      hidden: true,
      parse: printFlagDeprecation(["-A", "--auth-token"]),
    }),
    module: Flags.string({
      char: "m",
      description: "[optional] specific module name",
      exclusive: ["content-types"],
      parse: printFlagDeprecation(["-m"], ["--module"]),
    }),
    "content-types": Flags.string({
      char: "t",
      description: "[optional] content type",
      multiple: true,
      exclusive: ["module"],
      parse: printFlagDeprecation(["-t"], ["--content-types"]),
    }),
    branch: Flags.string({
      char: "B",
      // default: 'main',
      description: "[optional] branch name",
      parse: printFlagDeprecation(["-B"], ["--branch"]),
    }),
    "secured-assets": Flags.boolean({
      description: "[optional] use when assets are secured",
    }),
    yes: Flags.boolean({
      char: "y",
      required: false,
      description: "[optional] Override marketplace apps related prompts",
    }),
  };

  async run() {
    const { flags } = await this.parse(ExportCommand);

    await this.handleExportProcess(flags);
  }

  @ValidateFlags()
  @SetConfigData()
  async handleExportProcess(flags: Record<string, any>) {
    if (this.exportConfig.rewriteToTs.useOldScript) {
      OldExportCommand.run(this.convertObjectToArrayOfFlags(flags));
    } else {
      // NOTE new script
      const modules: string[] = this.exportConfig.modules.types;
      for (const module of modules) {
        switch (module) {
          case "assets":
            await this.exportMapping[module].run([
              "--config",
              JSON.stringify(this.exportConfig),
            ]);
            break;

          default:
            // await OldExportCommand.run([
            //   ...this.convertObjectToArrayOfFlags(flags),
            //   "--module",
            //   module,
            // ]);
            break;
        }
      }
    }
  }

  convertObjectToArrayOfFlags(flags: Record<string, any>) {
    return map(keys(flags), (key: string) => [`--${key}`, flags[key]]).flat();
  }
}
