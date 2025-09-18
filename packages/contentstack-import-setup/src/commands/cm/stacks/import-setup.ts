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
  static description = messageHandler.parse(
    'Helps to generate mappers and backup folder for importing (overwriting) specific modules',
  );

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
      char: 'B',
      description:
        "The name of the branch where you want to import your content. If you don't mention the branch name, then by default the content will be imported to the main branch.",
      parse: printFlagDeprecation(['-B'], ['--branch']),
      exclusive: ['branch-alias']
    }),
    'branch-alias': flags.string({
      description:
        "The alias of the branch where you want to import your content. If you don't mention the branch alias, then by default the content will be imported to the main branch.",
      exclusive: ['branch'],
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
        `Backup folder and mapper files have been successfully created for the stack using the API key ${importSetupConfig.apiKey}.`,
        'success',
      );
      log(
        importSetupConfig,
        `The backup folder has been created at '${pathValidator(path.join(importSetupConfig.backupDir))}'.`,
        'success',
      );
    } catch (error) {
      log(
        { data: '' } as ImportConfig,
        `Failed to create the backup folder and mapper files: ${formatError(error)}`,
        'error',
      );
    }
  }
}
