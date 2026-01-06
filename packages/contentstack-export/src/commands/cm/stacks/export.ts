import { Command } from '@contentstack/cli-command';
import {
  cliux,
  messageHandler,
  managementSDKClient,
  flags,
  ContentstackClient,
  FlagInput,
  pathValidator,
  sanitizePath,
  configHandler,
  log,
  handleAndLogError,
  getLogPath,
} from '@contentstack/cli-utilities';

import { ModuleExporter } from '../../../export';
import { Context, ExportConfig } from '../../../types';
import { setupExportConfig, writeExportMetaFile } from '../../../utils';

export default class ExportCommand extends Command {
  static description: string = messageHandler.parse('Export content from a stack');

  static examples: string[] = [
    'csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>',
    'csdx cm:stacks:export --config <path/to/config/dir>',
    'csdx cm:stacks:export --alias <management_token_alias>',
    'csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>',
    'csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>',
  ];

  static usage: string =
    'cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--branch-alias <value>] [--secured-assets]';

  static flags: FlagInput = {
    config: flags.string({
      char: 'c',
      description: '[optional] Path of the config',
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API Key of the source stack',
    }),
    'data-dir': flags.string({
      char: 'd',
      description: 'The path or the location in your file system to store the exported content. For e.g., ./content',
    }),
    alias: flags.string({
      char: 'a',
      description: 'The management token alias of the source stack from which you will export content.',
    }),
    'branch-alias': flags.string({
      description: '(Optional) The alias of the branch from which you want to export content.',
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
      const exportConfig = await setupExportConfig(flags);
      // Prepare the context object
      const context = this.createExportContext(exportConfig.apiKey, exportConfig.authenticationMethod);
      exportConfig.context = { ...context };
      //log.info(`Using Cli Version: ${this.context?.cliVersion}`, exportConfig.context);

      // Assign exportConfig variables
      this.assignExportConfig(exportConfig);

      exportDir = sanitizePath(exportConfig.cliLogsPath || exportConfig.data || exportConfig.exportDir);
      const managementAPIClient: ContentstackClient = await managementSDKClient(exportConfig);
      const moduleExporter = new ModuleExporter(managementAPIClient, exportConfig);
      await moduleExporter.start();
      if (!exportConfig.branches?.length) {
        writeExportMetaFile(exportConfig);
      }
      log.success(
        `The content of the stack ${exportConfig.apiKey} has been exported successfully!`,
        exportConfig.context,
      );
      log.info(`The exported content has been stored at '${exportDir}'.`, exportConfig.context);
      log.success(`The log has been stored at '${getLogPath()}'.`, exportConfig.context);
    } catch (error) {
      handleAndLogError(error);
      log.info(`The log has been stored at '${getLogPath()}'.`);
    }
  }

  // Create export context object
  private createExportContext(apiKey: string, authenticationMethod?: string): Context {
    return {
      command: this.context?.info?.command || 'cm:stacks:export',
      module: '',
      userId: configHandler.get('userUid') || '',
      email: configHandler.get('email') || '',
      sessionId: this.context?.sessionId || '',
      apiKey: apiKey || '',
      orgId: configHandler.get('oauthOrgUid') || '',
      authenticationMethod: authenticationMethod || 'Basic Auth',
    };
  }

  // Assign values to exportConfig
  private assignExportConfig(exportConfig: ExportConfig): void {
    // Note setting host to create cma client
    exportConfig.host = this.cmaHost;
    exportConfig.region = this.region;

    if (this.developerHubUrl) {
      exportConfig.developerHubBaseUrl = this.developerHubUrl;
    }

    if (this.personalizeUrl) {
      exportConfig.modules.personalize.baseURL[exportConfig.region.name] = this.personalizeUrl;
    }

    if (this.composableStudioUrl) {
      exportConfig.modules['composable-studio'].apiBaseUrl = this.composableStudioUrl;
    }
  }
}
