import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, managementSDKClient, flags } from '@contentstack/cli-utilities';

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
    const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
    const { flags: branchCreateFlags } = await this.parse(BranchCreateCommand);
    let apiKey = branchCreateFlags['stack-api-key'];
    let branch = {
      uid: branchCreateFlags.uid,
      source: branchCreateFlags.source,
    };

    if (!apiKey) {
      apiKey = await cliux.inquire({ type: 'input', message: 'ENTER_API_KEY', name: 'stack-api-key' });
    }
    if (!branchCreateFlags.source) {
      branch.source = await cliux.inquire({ type: 'input', message: 'ENTER_SOURCE_BRANCH', name: 'source' });
    }
    if (!branchCreateFlags.uid) {
      branch.uid = await cliux.inquire({ type: 'input', message: 'ENTER_BRANCH_UID', name: 'uid' });
    }

    managementAPIClient
      .stack({ api_key: apiKey })
      .branch()
      .create({ branch })
      .then(() =>
        cliux.success(
          'Branch creation in progress. Once ready, it will show in the results of the branch list command `csdx cm:branches`',
        ),
      )
      .catch((err: { errorCode: number; errorMessage: string }) =>
        err.errorCode === 910
          ? cliux.error(
              `Error : Branch with uid ${branchCreateFlags.uid} already exists, please enter unique branch uid`,
            )
          : cliux.error(err.errorMessage),
      );
  }
}
