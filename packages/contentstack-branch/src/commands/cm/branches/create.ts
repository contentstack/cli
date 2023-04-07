import { Command } from '@contentstack/cli-command';
import { messageHandler, flags } from '@contentstack/cli-utilities';
import { createBranch } from '../../../utils/create-branch';
import { interactive } from '../../../utils';

export default class BranchCreateCommand extends Command {
  static description: string = messageHandler.parse('Create a new branch'); // Note: Update the description

  static examples: string[] = [
    'csdx cm:branches',
    'csdx cm:branches:create',
    'csdx cm:branches:create -s main -u new_branch -k bltxxxxxxxx',
    'csdx cm:branches:create --source main --uid new_branch --stack-api-key bltxxxxxxxx',
  ]; // Note: Add and modify the examples

  static usage: string[] = [
    'cm:branches:create',
    'cm:branches:create [-s <value>] [-u <value>] [-k <value>]',
    'cm:branches:create [--source <value>] [--uid <value>] [--stack-api-key <value>]',
  ]; // Note: Add and modify the usage

  static flags = {
    uid: flags.string({ char: 'u', description: 'Branch Uid to be created' }),
    source: flags.string({ char: 's', description: 'Source branch from which new branch to be created' }),
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
