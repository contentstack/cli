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
  CLIProgressManager,
  clearProgressModuleSetting,
} from '@contentstack/cli-utilities';

import { ModuleExporter } from '../../../export';
import { Context, ExportConfig } from '../../../types';
import { setupExportConfig } from '../../../utils';

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
    'cm:stacks:export [--config <value>] [--stack-api-key <value>] [--data-dir <value>] [--alias <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]';

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
    module: flags.string({
      description:
        '[optional] Specific module name. If not specified, the export command will export all the modules to the stack. The available modules are assets, content-types, entries, environments, extensions, marketplace-apps, global-fields, labels, locales, webhooks, workflows, custom-roles, taxonomies, and studio.',
    }),
    'content-types': flags.string({
      description:
        '[optional]  The UID of the content type(s) whose content you want to export. In case of multiple content types, specify the IDs separated by spaces.',
      multiple: true,
    }),
    branch: flags.string({
      // default: 'main',
      description:
        "[optional] The name of the branch where you want to export your content. If you don't mention the branch name, then by default the content will be exported from all the branches of your stack.",
      exclusive: ['branch-alias'],
    }),
    'branch-alias': flags.string({
      description: '(Optional) The alias of the branch from which you want to export content.',
      exclusive: ['branch'],
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

  async run(): Promise<void> {
    let exportDir: string = pathValidator('logs');
    try {
      const { flags } = await this.parse(ExportCommand);
      const exportConfig = await setupExportConfig(flags);
      // Prepare the context object
      const context = this.createExportContext(exportConfig.apiKey, exportConfig.authenticationMethod);
      exportConfig.context = { ...context };

      // Assign exportConfig variables
      this.assignExportConfig(exportConfig);

      exportDir = sanitizePath(exportConfig.cliLogsPath || exportConfig.data || exportConfig.exportDir);
      const managementAPIClient: ContentstackClient = await managementSDKClient(exportConfig);
      const moduleExporter = new ModuleExporter(managementAPIClient, exportConfig);
      await moduleExporter.start();
      log.success(
        `The content of the stack ${exportConfig.apiKey} has been exported successfully!`,
        exportConfig.context,
      );
      log.info(`The exported content has been stored at '${exportDir}'`, exportConfig.context);
      log.success(`The log has been stored at '${getLogPath()}'`, exportConfig.context);

      // Print comprehensive summary at the end
      if (!exportConfig.branches) CLIProgressManager.printGlobalSummary();
      if (!configHandler.get('log')?.showConsoleLogs) {
        cliux.print(`The log has been stored at '${getLogPath()}'`, { color: 'green' });
      }
      // Clear progress module setting now that export is complete
      clearProgressModuleSetting();
    } catch (error) {
      // Clear progress module setting even on error
      clearProgressModuleSetting();
      handleAndLogError(error);
      if (!configHandler.get('log')?.showConsoleLogs) {
        cliux.print(`Error: ${error}`, { color: 'red' });
        cliux.print(`The log has been stored at '${getLogPath()}'`, { color: 'green' });
      }
    }
  }

  // Create export context object
  private createExportContext(apiKey: string, authenticationMethod?: string): Context {
    return {
      command: this.context?.info?.command || 'cm:stacks:export',
      module: '',
      userId: configHandler.get('userUid') || '',
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
