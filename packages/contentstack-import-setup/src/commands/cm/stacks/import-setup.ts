import path from 'node:path';
import { Command } from '@contentstack/cli-command';
import {
  messageHandler,
  managementSDKClient,
  flags,
  FlagInput,
  ContentstackClient,
  pathValidator,
  formatError,
  CLIProgressManager,
  log,
  handleAndLogError,
  configHandler,
} from '@contentstack/cli-utilities';

import { ImportConfig, Context } from '../../../types';
import { setupImportConfig } from '../../../utils';
import { ImportSetup } from '../../../import';

export default class ImportSetupCommand extends Command {
  static description = messageHandler.parse(
    'Helps to generate mappers and backup folder for importing (overwriting) specific modules',
  );

  static examples: string[] = [
    `csdx cm:stacks:import-setup --stack-api-key <target_stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name> --branch <branch_name>`,
  ];

  static flags: FlagInput = {
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API key of the target stack',
    }),
    'data-dir': flags.string({
      char: 'd',
      description: `The path or the location in your file system where the content, you intend to import, is stored. For example, -d "C:\\Users\\Name\\Desktop\\cli\\content". If the export folder has branches involved, then the path should point till the particular branch. For example, “-d "C:\\Users\\Name\\Desktop\\cli\\content\\branch_name"`,
    }),
    alias: flags.string({
      char: 'a',
      description: 'The management token of the destination stack where you will import the content.',
    }),
    module: flags.string({
      options: ['global-fields', 'content-types', 'entries'], // only allow the value to be from a discrete set
      description:
        '[optional] Specify the modules/module to import into the target stack. currently options are global-fields, content-types, entries',
      multiple: true,
    }),
    branch: flags.string({
      description:
        "The name of the branch where you want to import your content. If you don't mention the branch name, then by default the content will be imported to the main branch.",
      exclusive: ['branch-alias'],
    }),
    'branch-alias': flags.string({
      description:
        'Specify the branch alias where you want to import your content. If not specified, the content is imported into the main branch by default.',
      exclusive: ['branch'],
    }),
  };

  static aliases: string[] = [];

  static usage = 'cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]';

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(ImportSetupCommand);
      let importSetupConfig = await setupImportConfig(flags);
      // Prepare the context object
      const context = this.createImportSetupContext(
        importSetupConfig.apiKey,
        (importSetupConfig as any).authenticationMethod,
      );
      importSetupConfig.context = { ...context };

      // Note setting host to create cma client
      importSetupConfig.host = this.cmaHost;
      importSetupConfig.region = this.region;
      importSetupConfig.developerHubBaseUrl = this.developerHubUrl;

      if (flags.branch) {
        CLIProgressManager.initializeGlobalSummary(
          `IMPORT-SETUP-${flags.branch}`,
          flags.branch,
          `Setting up import for "${flags.branch}" branch...`,
        );
      } else {
        CLIProgressManager.initializeGlobalSummary(`IMPORT-SETUP`, flags.branch, 'Setting up import...');
      }

      const managementAPIClient: ContentstackClient = await managementSDKClient(importSetupConfig);
      const importSetup = new ImportSetup(importSetupConfig, managementAPIClient);
      await importSetup.start();

      CLIProgressManager.printGlobalSummary();

      log.success(
        `Backup folder and mapper files have been successfully created for the stack using the API key ${importSetupConfig.apiKey}.`,
        importSetupConfig.context,
      );
      log.success(
        `The backup folder has been created at '${pathValidator(path.join(importSetupConfig.backupDir))}'.`,
        importSetupConfig.context,
      );
    } catch (error) {
      CLIProgressManager.printGlobalSummary();
      handleAndLogError(error);
    }
  }

  // Create import setup context object
  private createImportSetupContext(apiKey: string, authenticationMethod?: string, module?: string): Context {
    return {
      command: this.context?.info?.command || 'cm:stacks:import-setup',
      module: module || '',
      userId: configHandler.get('userUid') || undefined,
      email: configHandler.get('email') || undefined,
      sessionId: this.context?.sessionId,
      apiKey: apiKey || '',
      orgId: configHandler.get('oauthOrgUid') || '',
      authenticationMethod: authenticationMethod || 'Basic Auth',
    };
  }
}
