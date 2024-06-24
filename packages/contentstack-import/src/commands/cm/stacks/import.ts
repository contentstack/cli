import path from 'node:path';
import { Command } from '@contentstack/cli-command';
import {
  messageHandler,
  printFlagDeprecation,
  managementSDKClient,
  flags,
  FlagInput,
  ContentstackClient,
  pathValidator,
} from '@contentstack/cli-utilities';

import { ImportConfig } from '../../../types';
import { ModuleImporter } from '../../../import';
import { setupImportConfig, formatError, log } from '../../../utils';

export default class ImportCommand extends Command {
  static description = messageHandler.parse('Import content from a stack');

  static examples: string[] = [
    `csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>`,
    `csdx cm:stacks:import --config <path/of/config/dir>`,
    `csdx cm:stacks:import --module <single module name>`,
    `csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>`,
    `csdx cm:stacks:import --alias <management_token_alias>`,
    `csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>`,
    `csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>`,
    `csdx cm:stacks:import --branch <branch name>  --yes --skip-audit`,
  ];

  static flags: FlagInput = {
    config: flags.string({
      char: 'c',
      description: '[optional] path of config file',
    }),
    'stack-uid': flags.string({
      char: 's',
      description: 'API key of the target stack',
      hidden: true,
      parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API key of the target stack',
    }),
    data: flags.string({
      description: 'path and location where data is stored',
      hidden: true,
      parse: printFlagDeprecation(['--data'], ['--data-dir']),
    }),
    'data-dir': flags.string({
      char: 'd',
      description: 'path and location where data is stored',
    }),
    alias: flags.string({
      char: 'a',
      description: 'alias of the management token',
    }),
    'management-token-alias': flags.string({
      description: 'alias of the management token',
      hidden: true,
      parse: printFlagDeprecation(['--management-token-alias'], ['-a', '--alias']),
    }),
    'auth-token': flags.boolean({
      char: 'A',
      description: 'to use auth token',
      hidden: true,
      parse: printFlagDeprecation(['-A', '--auth-token']),
    }),
    module: flags.string({
      required: false,
      char: 'm',
      description: '[optional] specific module name',
      parse: printFlagDeprecation(['-m'], ['--module']),
    }),
    'backup-dir': flags.string({
      char: 'b',
      description: '[optional] backup directory name when using specific module',
      parse: printFlagDeprecation(['-b'], ['--backup-dir']),
    }),
    branch: flags.string({
      char: 'B',
      description: '[optional] branch name',
      parse: printFlagDeprecation(['-B'], ['--branch']),
    }),
    'import-webhook-status': flags.string({
      description: '[optional] Webhook state',
      options: ['disable', 'current'],
      required: false,
      default: 'disable',
    }),
    yes: flags.boolean({
      char: 'y',
      required: false,
      description: '[optional] Override marketplace prompts',
    }),
    'skip-app-recreation': flags.boolean({
      description: '[optional] Skip private apps recreation if already exist',
    }),
    'replace-existing': flags.boolean({
      required: false,
      description: 'Replaces the existing module in the target stack.',
    }),
    'skip-existing': flags.boolean({
      required: false,
      default: false,
      description: 'Skips the module exists warning messages.',
    }),
    'skip-audit': flags.boolean({
      description: 'Skips the audit fix.',
    }),
    'exclude-global-modules': flags.boolean({
      description: 'Excludes the branch-independent module from the import operation',
      default: false
    }),
  };

  static aliases: string[] = ['cm:import'];

  static usage: string =
    'cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]';

  async run(): Promise<void> {
    // setup import config
    // initialize the importer
    // start import
    let backupDir: string;
    try {
      const { flags } = await this.parse(ImportCommand);
      let importConfig = await setupImportConfig(flags);
      // Note setting host to create cma client
      importConfig.host = this.cmaHost;
      backupDir = importConfig.cliLogsPath || importConfig.backupDir;

      const managementAPIClient: ContentstackClient = await managementSDKClient(importConfig);
      const moduleImporter = new ModuleImporter(managementAPIClient, importConfig);
      const result = await moduleImporter.start();

      if (!result?.noSuccessMsg) {
        log(
          importConfig,
          importConfig.stackName
            ? `Successfully imported the content to the stack named ${importConfig.stackName} with the API key ${importConfig.apiKey} .`
            : `The content has been imported to the stack ${importConfig.apiKey} successfully!`,
          'success',
        );
      }

      log(
        importConfig,
        `The log has been stored at '${pathValidator(
          path.join(importConfig.cliLogsPath || importConfig.backupDir, 'logs', 'import'),
        )}'`,
        'success',
      );
    } catch (error) {
      log(
        { data: backupDir ?? pathValidator(path.join(backupDir || __dirname, 'logs', 'import')) } as ImportConfig,
        `Failed to import stack content - ${formatError(error)}`,
        'error',
      );
      log(
        { data: backupDir } as ImportConfig,
        `The log has been stored at ${
          { data: backupDir }
            ? pathValidator(path.join(backupDir || __dirname, 'logs', 'import'))
            : pathValidator(path.join(__dirname, 'logs'))
        }`,
        'info',
      );
    }
  }
}
