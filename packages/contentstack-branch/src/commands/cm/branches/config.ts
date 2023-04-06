import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, flags, configHandler } from '@contentstack/cli-utilities';
import { writeFileSync } from 'fs';

export default class BranchConfigCommand extends Command {
  static description: string = messageHandler.parse('Set the branch'); // Note: improve the description

  static examples: string[] = [
    'csdx cm:branches:config -k <stack api key> --base-branch <base branch>',
    'csdx cm:branches:config --global -k <stack api key> --base-branch <base branch>',
    'csdx cm:branches:config --global -k <stack api key>',
  ]; // Note: add more examples

  static usage: string = 'cm:branches:config --global [--base-branch <value>] [--stack-api-key <value>]'; // Note: add all flags

  static flags = {
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key', required: true }),
    'base-branch': flags.string({ char: 'b', description: 'Base Branch', default: 'main' }),
    global: flags.boolean({ char: 'g', description: 'global configuration' }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const { flags: branchConfigFlags } = await this.parse(BranchConfigCommand);
      let apiKey = branchConfigFlags['stack-api-key'];
      let baseBranch = branchConfigFlags['base-branch'];
      let global = branchConfigFlags['global'];

      if (!apiKey) {
        apiKey = await cliux.inquire({ type: 'input', message: 'ENTER_API_KEY', name: 'stack-api-key' });
      }

      if (!baseBranch) {
        baseBranch = await cliux.inquire({ type: 'input', message: 'ENTER_BASE_BRANCH', name: 'base-branch' });
      }

      if (global) {
        configHandler.set(`base-branch`, { baseBranch, apiKey });
      } else {
        let branchJson = JSON.stringify({
          'base-branch': {
            apiKey: apiKey,
            baseBranch: baseBranch,
          },
        });

        writeFileSync(__dirname + '/branch-config.json', branchJson);
        cliux.print(`Config file: ${__dirname + '/branch-config.json'}`);
      }

      cliux.print('Base Branch: ' + baseBranch, { color: 'blue' });
      cliux.print('Stack Api Key: ' + apiKey, { color: 'blue' });
    } catch (error) {
      cliux.error(error);
    }
  }
}
