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
import { ImportSetup } from 'src/import';

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
      required: false,
      description: '[optional] specific module name',
    }),
  };

  static aliases: string[] = ['cm:import'];

  static usage: string = 'cm:stacks:import [-k <value>] [-d <value>] [-a <value>] [--modules <value,value>]';

  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(ImportSetupCommand);
      let importSetupConfig = await setupImportConfig(flags);
      const importSetup = new ImportSetup(importSetupConfig);
      await importSetup.start();
      log(
        importSetupConfig,
        importSetupConfig.stackName
          ? `Successfully generated mapper files for the stack named ${importSetupConfig.stackName} with the API key ${importSetupConfig.apiKey}.`
          : `Mapper files have been generated for the stack ${importSetupConfig.apiKey} successfully!`,
        'success',
      );
      log(
        importSetupConfig,
        `The mapper files have been stored at '${pathValidator(path.join(importSetupConfig.backupDirPath, 'mapper'))}'`,
        'success',
      );
    } catch (error) {
      log({ data: '' } as ImportConfig, `Failed to generate mapper files - ${formatError(error)}`, 'error');
    }
  }
}
