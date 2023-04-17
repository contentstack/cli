import { Command } from '@contentstack/cli-command';
import { messageHandler, flags } from '@contentstack/cli-utilities';
import { BranchOptions } from '../../../interfaces/index';
import { BranchDiffHandler } from '../../../branch';

export default class BranchDiffCommand extends Command {
  static description: string = messageHandler.parse('Differences between two branches');

  static examples: string[] = [
    'csdx cm:branches:diff',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop"',
    'csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content_types"',
    'csdx cm:branches:diff --module "content_types" --format "detailedText"',
    'csdx cm:branches:diff --compare-branch "develop" --format "detailedText"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --module "content_types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content_types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content_types" --format "detailedText"',
  ];

  static usage: string = 'cm:branches:diff [-b <value>] [-c <value>] [-k <value>][-m <value>]';

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
      default: 'compactText',
      multiple: false,
      options: ['compactText', 'detailedText'],
      description: '[Optional] Type of flags to show branches differences',
    }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const { flags: branchDiffFlags } = await this.parse(BranchDiffCommand);
      let options: BranchOptions = {
        baseBranch: branchDiffFlags['base-branch'],
        stackAPIKey: branchDiffFlags['stack-api-key'],
        compareBranch: branchDiffFlags['compare-branch'],
        module: branchDiffFlags.module,
        format: branchDiffFlags.format,
      };
      const diffHandler = new BranchDiffHandler(options);
      await diffHandler.run();
    } catch (error: any) {
      this.error(error, { exit: 1, suggestions: error.suggestions });
    }
  }
}
