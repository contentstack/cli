import { cliux, configHandler } from '@contentstack/cli-utilities';
import { Command } from '@contentstack/cli-command';

export default class GetEarlyAccessHeaderCommand extends Command {
  static description = 'Display Early Access headers';
  static aliases: string[] = ['config:get:ea-header'];
  static examples = ['$ <%= config.bin %> <%= command.id %>'];

  async run() {
    try {
      let config = configHandler.get(`earlyAccessHeaders`);
      if (config && Object.keys(config).length > 0) {
        let tableData = Object.keys(config).map((key) => ({
          ['Alias']: key,
          ['Early access header']: config[key],
        }));
        const tableHeaders = [
          {
            value: 'Alias',
          },
          {
            value: 'Early access header',
          },
        ];
        cliux.table(tableHeaders, tableData);
      } else {
        cliux.print(`No Early Access header found!`, { color: 'red' });
      }
    } catch (error) {
      this.log('Unable to retrieve the Early Access header config', error instanceof Error ? error.message : error);
    }
  }
}
