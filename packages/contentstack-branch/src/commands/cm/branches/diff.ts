import { Command } from '@contentstack/cli-command';
import { messageHandler, managementSDKClient, flags, cliux, configHandler } from '@contentstack/cli-utilities';
import { BranchOptions } from '../../../interfaces/index';
import { BranchDiff } from '../../../branch';
import { getbranchConfig } from '../../../utils';

export default class BranchDiffCommand extends Command {
  static description: string = messageHandler.parse('Differences between two branches');

  static examples: string[] = [
    'csdx cm:branches:diff',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop"',
    'csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content-types"',
    'csdx cm:branches:diff --module "content-types" --format "verbose"',
    'csdx cm:branches:diff --compare-branch "develop" --format "verbose"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content-types" --filter "{content_type: "uid"}"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content-types" --format "verbose" --filter "{content_type: "uid"}"',
  ];

  static usage: string = 'cm:branches:diff [-c <value>] [-k <value>][-m <value>]';

  static flags = {
    'base-branch': flags.string({
      char: 'b',
      description: 'Base branch',
    }),
    'compare-branch': flags.string({
      char: 'c',
      description: 'Compare branch',
    }),
    module: flags.string({
      char: 'm',
      description: 'Module',
      options: ['content_types', 'global_fields', 'both'],
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'Provide stack api key to show diff between branches',
    }),
    format: flags.string({
      default: 'text',
      multiple: false,
      options: ['text', 'verbose'],
      description: '[Optional] Type of flags to show branches difference view',
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    console.log(configHandler.get('authtoken'));
    try {
      const { flags: branchDiffFlags } = await this.parse(BranchDiffCommand);
      let options: BranchOptions = {
        baseBranch: branchDiffFlags['base-branch'],
        stackAPIKey: branchDiffFlags['stack-api-key'],
        compareBranch: branchDiffFlags['compare-branch'],
        module: branchDiffFlags.module,
        format: branchDiffFlags.format,
      };
      const branchDiff = new BranchDiff(options);
      await branchDiff.run();
    } catch (error: any) {
      this.error(error, { exit: 1, suggestions: error.suggestions });
    }
  }
}
