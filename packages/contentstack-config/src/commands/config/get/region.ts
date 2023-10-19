import { Command } from '@contentstack/cli-command';
import { cliux } from '@contentstack/cli-utilities';

import { Region } from '../../../interfaces';
import { BaseCommand } from '../../../base-command';
export default class RegionGetCommand extends BaseCommand<typeof RegionGetCommand> {
  static description = 'Get current region set for CLI';
  static examples = ['$ csdx config:get:region'];
  config: any;
  async run() {
    let currentRegion: Region = this.region;
    if (!currentRegion) {
      this.logger.error('No region set');
      cliux.error('CLI_CONFIG_GET_REGION_NOT_FOUND');
      this.exit();
    }
    cliux.print(`Currently using ${currentRegion.name} region`);
    cliux.print(`CDA HOST: ${currentRegion.cda}`);
    cliux.print(`CMA HOST: ${currentRegion.cma}`);
    cliux.print(`UI HOST: ${currentRegion.uiHost}`);
    this.logger.error(`Currently using ${currentRegion.name} region`);

  }
}
