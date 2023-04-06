import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, managementSDKClient, flags } from '@contentstack/cli-utilities';
import { getbranchesList, getbranchConfig } from '../../../utils/index';
import chalk from 'chalk';

export default class BranchListCommand extends Command {
  static description: string = messageHandler.parse('List the branches to select'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches', 'csdx cm:branches --verbose']; // Note: Add and modify the examples

  static usage: string = 'cm:branches'; // Note: Add and modify the usage

  static flags = {
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchListFlags } = await this.parse(BranchListCommand);
      let verbose = branchListFlags['verbose'];
      let localConfigPath = __dirname + '/branch-config.json';
      let config = getbranchConfig(localConfigPath);

      if (config && Object.keys(config).length > 0) {
        const branchResult = await managementAPIClient.stack({ api_key: config.apiKey }).branch().query().find();

        if (branchResult && branchResult.items.length > 0) {
          let { currentBranch, otherBranches, branches }: any = getbranchesList(branchResult, config.baseBranch);

          if (!verbose) {
            cliux.print(`* ${chalk.blue.bold(currentBranch[0].Branch)}`);

            otherBranches.map(({ Branch, Source }: { Branch: string; Source: string }) => {
              Source
                ? cliux.print(`${Branch} (source: ${Source})`, { color: 'blue' })
                : cliux.print(Branch, { color: 'blue' });
            });
          } else {
            cliux.table(
              branches,
              {
                Branch: {
                  minWidth: 8,
                },
                Source: {
                  minWidth: 8,
                },
                Aliases: {
                  minWidth: 8,
                },
                Created: {
                  minWidth: 8,
                },
                Updated: {
                  minWidth: 8,
                },
              },
              {
                printLine: cliux.print,
              },
            );
          }
        } else {
          cliux.print('Branches not present');
        }
      }
    } catch (error) {
      cliux.error('error', error);
    }
  }
}
