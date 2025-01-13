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
  formatError,
} from '@contentstack/cli-utilities';

import { ImportConfig } from '../../../types';
import { setupImportConfig, log } from '../../../utils';
import { ImportSetup } from '../../../import';

export default class ImportSetupCommand extends Command {
  static description = messageHandler.parse('Import content from a stack');

  static examples: string[] = [
    `csdx cm:stacks:import-setup --stack-api-key <target_stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>`,
    `csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name>`,
    `csdx cm:stacks:import-setup -k <target_stack_api_key> -d <path/of/export/destination/dir> --modules <module_name, module_name> -b <branch_name>`,
  ];

  static flags: FlagInput = {
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API key of the target stack',
    }),
    'data-dir': flags.string({
      char: 'd',
      description: 'path and location where data is stored',
    }),
    alias: flags.string({
      char: 'a',
      description: 'alias of the management token',
    }),
    modules: flags.string({
      options: ['global-fields', 'content-types', 'entries'], // only allow the value to be from a discrete set
      description: '[optional] specific module name',
      multiple: true,
    }),
    branch: flags.string({
      char: 'B',
      description: "The name of the target stack's branch",
      parse: printFlagDeprecation(['-B'], ['--branch']),
    }),
  };

  static aliases: string[] = ['cm:import-setup'];

  static usage: string = 'cm:stacks:import-setup [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]';

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(ImportSetupCommand);
      let importSetupConfig = await setupImportConfig(flags);
      // Note setting host to create cma client
      importSetupConfig.host = this.cmaHost;
      importSetupConfig.region = this.region;
      importSetupConfig.developerHubBaseUrl = this.developerHubUrl;
      const managementAPIClient: ContentstackClient = await managementSDKClient(importSetupConfig);
      const importSetup = new ImportSetup(importSetupConfig, managementAPIClient);
      await importSetup.start();
      log(
        importSetupConfig,
        `Successfully created backup folder and mapper files for the stack with the API key ${importSetupConfig.apiKey}.`,
        'success',
      );
      log(
        importSetupConfig,
        `The backup folder created at '${pathValidator(path.join(importSetupConfig.backupDir))}'`,
        'success',
      );
    } catch (error) {
      log(
        { data: '' } as ImportConfig,
        `Failed to create backup folder and mapper files - ${formatError(error)}`,
        'error',
      );
    }
  }
}
