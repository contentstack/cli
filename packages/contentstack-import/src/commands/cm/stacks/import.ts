import path from 'node:path';
import { Command } from '@contentstack/cli-command';
import {
  messageHandler,
  printFlagDeprecation,
  managementSDKClient,
  flags,
  FlagInput,
  ContentstackClient,
} from '@contentstack/cli-utilities';
import { ModuleImporter } from '../../../import';
import { setupImportConfig, formatError, log } from '../../../utils';
import { ImportConfig } from '../../../types';

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
    `csdx cm:stacks:import --branch <branch name>  --yes`,
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
  };

  static aliases: string[] = ['cm:import'];

  static usage: string =
    'cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]';

  async run(): Promise<void> {
    // setup import config
    // initialize the importer
    // start import
    let contentDir: string;
    try {
      const { flags } = await this.parse(ImportCommand);
      let importConfig = await setupImportConfig(flags);
      // Note setting host to create cma client
      importConfig.host = this.cmaHost;
      contentDir = importConfig.contentDir;
      const managementAPIClient: ContentstackClient = await managementSDKClient(importConfig);
      const moduleImporter = new ModuleImporter(managementAPIClient, importConfig);
      await moduleImporter.start();
      log(importConfig, `The content has been imported to the stack ${importConfig.apiKey} successfully!`, 'success');
    } catch (error) {
      log({ data: contentDir } as ImportConfig, `Failed to import stack content - ${formatError(error)}`, 'error');
      log(
        { data: contentDir } as ImportConfig,
        `The log has been stored at ${
          { data: contentDir } ? path.join(contentDir || __dirname, 'logs', 'import') : path.join(__dirname, 'logs')
        }`,
        'info',
      );
    }
  }
}
