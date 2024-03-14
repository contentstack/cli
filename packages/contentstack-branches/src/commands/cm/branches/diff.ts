import { Command } from '@contentstack/cli-command';
import { messageHandler, flags, isAuthenticated } from '@contentstack/cli-utilities';
import { BranchOptions } from '../../../interfaces/index';
import { BranchDiffHandler } from '../../../branch';
import { handleErrorMsg } from '../../../utils';

export default class BranchDiffCommand extends Command {
  static description: string = messageHandler.parse('Differences between two branches');

  static examples: string[] = [
    'csdx cm:branches:diff',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop"',
    'csdx cm:branches:diff --compare-branch "develop" --stack-api-key "bltxxxxxxxx"',
    'csdx cm:branches:diff --compare-branch "develop" --module "content-types"',
    'csdx cm:branches:diff --module "content-types" --format "detailed-text"',
    'csdx cm:branches:diff --compare-branch "develop" --format "detailed-text"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --module "content-types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types"',
    'csdx cm:branches:diff --stack-api-key "bltxxxxxxxx" --base-branch "main" --compare-branch "develop" --module "content-types" --format "detailed-text"',
  ]

  static usage: string = 'cm:branches:diff [--base-branch <value>] [--compare-branch <value>] [-k <value>][--module <value>]';

  static flags = {
    'base-branch': flags.string({
      description: 'Base branch',
    }),
    'compare-branch': flags.string({
      description: 'Compare branch',
    }),
    module: flags.string({
      description: 'Module',
      options: ['content-types', 'global-fields', 'all'],
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'Provide Stack API key to show difference between branches',
    }),
    format: flags.string({
      default: 'compact-text',
      multiple: false,
      options: ['compact-text', 'detailed-text'],
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
        host: this.cmaHost
      };
      if (!isAuthenticated()) {
        const err = { errorMessage: 'You are not logged in. Please login with command $ csdx auth:login' };
        handleErrorMsg(err);
      }
      const diffHandler = new BranchDiffHandler(options);
      await diffHandler.run();
    } catch (error: any) {
      this.error(error, { exit: 1, suggestions: error.suggestions });
    }
  }
}
