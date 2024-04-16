import path from 'path';
import { Command } from '@contentstack/cli-command';
import {
  cliux,
  messageHandler,
  printFlagDeprecation,
  managementSDKClient,
  flags,
  ContentstackClient,
  FlagInput,
  pathValidator,
} from '@contentstack/cli-utilities';
import { ModuleExporter } from '../../../export';
import { setupExportConfig, log, formatError, writeExportMetaFile } from '../../../utils';
import { ExportConfig } from '../../../types';

export default class ExportCommand extends Command {
  static description: string = messageHandler.parse('Export content from a stack');

  static examples: string[] = [
    'csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>',
    'csdx cm:stacks:export --config <path/to/config/dir>',
    'csdx cm:stacks:export --alias <management_token_alias>',
    'csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>',
    'csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>',
    'csdx cm:stacks:export --module <single module name>',
    'csdx cm:stacks:export --branch [optional] branch name',
  ];

  static usage: string =
    'cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]';

  static flags: FlagInput = {
    config: flags.string({
      char: 'c',
      description: '[optional] path of the config',
    }),
    'stack-uid': flags.string({
      char: 's',
      description: 'API key of the source stack',
      hidden: true,
      parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API key of the source stack',
    }),
    data: flags.string({
      description: 'path or location to store the data',
      hidden: true,
      parse: printFlagDeprecation(['--data'], ['--data-dir']),
    }),
    'data-dir': flags.string({
      char: 'd',
      description: 'path or location to store the data',
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
    'content-types': flags.string({
      char: 't',
      description: '[optional] content type',
      multiple: true,
      parse: printFlagDeprecation(['-t'], ['--content-types']),
    }),
    branch: flags.string({
      char: 'B',
      // default: 'main',
      description: '[optional] branch name',
      parse: printFlagDeprecation(['-B'], ['--branch']),
    }),
    'secured-assets': flags.boolean({
      description: '[optional] use when assets are secured',
    }),
    yes: flags.boolean({
      char: 'y',
      required: false,
      description: '[optional] Override marketplace apps related prompts',
    }),
  };

  static aliases: string[] = ['cm:export'];

  async run(): Promise<void> {
    let exportDir: string = pathValidator('logs');
    try {
      const { flags } = await this.parse(ExportCommand);
      let exportConfig = await setupExportConfig(flags);
      // Note setting host to create cma client
      exportConfig.host = this.cmaHost;
      exportDir = exportConfig.cliLogsPath || exportConfig.data || exportConfig.exportDir;
      const managementAPIClient: ContentstackClient = await managementSDKClient(exportConfig);
      const moduleExporter = new ModuleExporter(managementAPIClient, exportConfig);
      await moduleExporter.start();
      if (!exportConfig.branches?.length) {
        writeExportMetaFile(exportConfig);
      }
      log(exportConfig, `The content of the stack ${exportConfig.apiKey} has been exported successfully!`, 'success');
      log(
        exportConfig,
        `The log has been stored at '${pathValidator(path.join(exportDir, 'logs', 'export'))}'`,
        'success',
      );
    } catch (error) {
      log({ data: exportDir } as ExportConfig, `Failed to export stack content - ${formatError(error)}`, 'error');
      log({ data: exportDir } as ExportConfig, `The log has been stored at ${exportDir}`, 'info');
    }
  }
}
