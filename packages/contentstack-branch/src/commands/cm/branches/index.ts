import { Command } from '@contentstack/cli-command';
import { cliux, messageHandler, managementSDKClient, flags } from '@contentstack/cli-utilities';
import { getbranchesList, getbranchConfig } from '../../../utils/index';

export default class BranchListCommand extends Command {
  static description: string = messageHandler.parse('List the branches'); // Note: Update the description

  static examples: string[] = ['csdx cm:branches', 'csdx cm:branches --verbose', 'csdx cm:branches -k <stack api key>']; // Note: Add and modify the examples

  static usage: string = 'cm:branches'; // Note: Add and modify the usage

  static flags = {
    'stack-api-key': flags.string({ char: 'k', description: 'Stack API Key' }),
    verbose: flags.boolean({ char: 'v', description: 'Verbose' }),
  };

  static aliases: string[] = []; // Note: alternative usage if any

  async run(): Promise<any> {
    try {
      const managementAPIClient = await managementSDKClient({ host: this.cmaHost });
      const { flags: branchListFlags } = await this.parse(BranchListCommand);
      let stackApiKey = branchListFlags['stack-api-key'];
      let verbose = branchListFlags['verbose'];
      let apiKey;

      if (!stackApiKey) {
        apiKey = getbranchConfig()?.apiKey;
      } else {
        apiKey = stackApiKey;
      }

      if (apiKey) {
        const branchResult = await managementAPIClient.stack({ api_key: apiKey }).branch().query().find();

        if (branchResult && branchResult.items.length > 0) {
          let branches = getbranchesList(branchResult);

          if (!verbose) {
            branches.map(({ Branch, Source }: { Branch: string; Source: string }) => {
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
