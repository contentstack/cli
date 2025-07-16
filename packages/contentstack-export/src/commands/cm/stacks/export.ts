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
  sanitizePath,
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
      description: '[optional] Path of the config',
    }),
    'stack-uid': flags.string({
      char: 's',
      description: 'API key of the source stack',
      hidden: true,
      parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API Key of the source stack',
    }),
    data: flags.string({
      description: 'path or location to store the data',
      hidden: true,
      parse: printFlagDeprecation(['--data'], ['--data-dir']),
    }),
    'data-dir': flags.string({
      char: 'd',
      description: 'The path or the location in your file system to store the exported content. For e.g., ./content',
    }),
    alias: flags.string({
      char: 'a',
      description: 'The management token alias of the source stack from which you will export content.',
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
      description:
        '[optional] Specific module name. If not specified, the export command will export all the modules to the stack. The available modules are assets, content-types, entries, environments, extensions, marketplace-apps, global-fields, labels, locales, webhooks, workflows, custom-roles, and taxonomies.',
      parse: printFlagDeprecation(['-m'], ['--module']),
    }),
    'content-types': flags.string({
      char: 't',
      description:
        '[optional]  The UID of the content type(s) whose content you want to export. In case of multiple content types, specify the IDs separated by spaces.',
      multiple: true,
      parse: printFlagDeprecation(['-t'], ['--content-types']),
    }),
    branch: flags.string({
      char: 'B',
      // default: 'main',
      description:
        "[optional] The name of the branch where you want to export your content. If you don't mention the branch name, then by default the content will be exported from all the branches of your stack.",
      parse: printFlagDeprecation(['-B'], ['--branch']),
    }),
    'secured-assets': flags.boolean({
      description: '[optional] Use this flag for assets that are secured.',
    }),
    yes: flags.boolean({
      char: 'y',
      required: false,
      description: '[optional] Force override all Marketplace prompts.',
    }),
    query: flags.string({
      description: '[optional] Query object (inline JSON or file path) to filter module exports.',
      hidden: true,
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
      exportConfig.region = this.region;
      if (this.developerHubUrl) exportConfig.developerHubBaseUrl = this.developerHubUrl;
      if (this.personalizeUrl) exportConfig.modules.personalize.baseURL[exportConfig.region.name] = this.personalizeUrl;
      exportDir = sanitizePath(exportConfig.cliLogsPath || exportConfig.data || exportConfig.exportDir);
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
