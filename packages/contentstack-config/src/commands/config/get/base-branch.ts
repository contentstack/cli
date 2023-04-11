import { Command } from '@contentstack/cli-command';
import { cliux, configHandler } from '@contentstack/cli-utilities';

export default class BranchGetCommand extends Command {
  static description = 'Get current branch set for CLI';

  static examples = ['$ csdx config:get:base-branch'];

  async run() {
    try {
      let config = configHandler.get(`baseBranch`);
      let configList = Object.keys(config).map((key) => ({ ['Stack API Key']: key, ['Branch']: config[key] }));
      cliux.table(
        configList,
        {
          'Stack API Key': {
            minWidth: 8,
          },
          Branch: {
            minWidth: 8,
          },
        },
        {
          printLine: cliux.print,
        },
      );
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
