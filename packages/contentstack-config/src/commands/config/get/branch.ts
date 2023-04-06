import { Command } from '@contentstack/cli-command';
import { cliux, configHandler } from '@contentstack/cli-utilities';

export default class BranchGetCommand extends Command {
  static description = 'Get current branch set for CLI';

  static examples = ['$ csdx config:get:branch'];

  async run() {
    try {
      let config = configHandler.get(`baseBranch`);
      let configList = Object.keys(config).map((key) => ({ ['ApiKey']: key, ['Branch']: config[key] }));

      cliux.table(
        configList,
        {
          ApiKey: {
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
