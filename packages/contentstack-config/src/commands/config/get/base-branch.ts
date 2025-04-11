import { Command } from '@contentstack/cli-command';
import { cliux, configHandler, messageHandler, TableHeader } from '@contentstack/cli-utilities';

export default class BranchGetCommand extends Command {
  static description = 'Get current branch set for CLI';

  static examples = ['$ csdx config:get:base-branch'];

  async run() {
    try {
      let config = configHandler.get(`baseBranch`);
      if (config && Object.keys(config).length > 0) {
        let configList = Object.keys(config).map((key) => ({ ['Stack API Key']: key, ['Branch']: config[key] }));
        const headers: TableHeader[] = [
          {
            value: 'Stack API Key',
          },
          {
            value: 'Branch',
          },
        ];

        cliux.table(headers, configList);
      } else {
        cliux.print(`error: ${messageHandler.parse('CLI_CONFIG_BRANCH_LIST_NO_BRANCHES')}`, { color: 'red' });
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
