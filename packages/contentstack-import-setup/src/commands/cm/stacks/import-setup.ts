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
import { setupImportConfig, formatError, log } from '../../../utils';
import { ImportSetup } from '../../../import';

export default class ImportSetupCommand extends Command {
  static description = messageHandler.parse('Import content from a stack');

  static examples: string[] = [
    `csdx cm:stacks:import-setup --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir> --modules <module_name, module_name>`,
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
      options: ['content-types', 'entries', 'both'], // only allow the value to be from a discrete set
      description: '[optional] specific module name',
    }),
  };

  static aliases: string[] = ['cm:import'];

  static usage: string = 'cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]';

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(ImportSetupCommand);
      let importSetupConfig = await setupImportConfig(flags);
      const managementAPIClient: ContentstackClient = await managementSDKClient(importSetupConfig);
      const importSetup = new ImportSetup(importSetupConfig, managementAPIClient);
      await importSetup.start();
      log(
        importSetupConfig,
        `Successfully created back folder and mapper files for the stack with the API key ${importSetupConfig.apiKey}.`,
        'success',
      );
      log(
        importSetupConfig,
        `The back folder created at '${pathValidator(path.join(importSetupConfig.backupDir))}'`,
        'success',
      );
    } catch (error) {
      log(
        { data: '' } as ImportConfig,
        `Failed to create back folder and mapper files - ${formatError(error)}`,
        'error',
      );
    }
  }
}
