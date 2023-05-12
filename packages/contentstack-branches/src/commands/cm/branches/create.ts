import { Command } from '@contentstack/cli-command';
import { messageHandler, flags } from '@contentstack/cli-utilities';
import { createBranch } from '../../../utils/create-branch';
import { interactive } from '../../../utils';

export default class BranchCreateCommand extends Command {
  static description: string = messageHandler.parse('Create a new branch'); // Note: Update the description

  static examples: string[] = [
    'csdx cm:branches:create',
    'csdx cm:branches:create --source main -uid new_branch -k bltxxxxxxxx',
    'csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx',
  ]; // Note: Add and modify the examples

  static usage: string[] = [
    'cm:branches:create',
    'cm:branches:create [--source <value>] [--uid <value>] [-k <value>]',
    'cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]',
  ]; // Note: Add and modify the usage

  static flags = {
    uid: flags.string({ description: 'Branch UID to be created' }),
    source: flags.string({ description: 'Source branch from which new branch to be created' }),
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API key' }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    const { flags: branchCreateFlags } = await this.parse(BranchCreateCommand);
    let apiKey = branchCreateFlags['stack-api-key'];
    let branch = {
      uid: branchCreateFlags.uid,
      source: branchCreateFlags.source,
    };

    if (!apiKey) {
      apiKey = await interactive.askStackAPIKey();
    }

    if (!branchCreateFlags.source) {
      branch.source = await interactive.askSourceBranch();
    }
    if (!branchCreateFlags.uid) {
      branch.uid = await interactive.askBranchUid();
    }
    await createBranch(this.cmaHost, apiKey, branch);
  }
}
