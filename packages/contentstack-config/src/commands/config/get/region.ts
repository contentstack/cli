import { Command } from '@contentstack/cli-command';
import { cliux, logger } from '@contentstack/cli-utilities';

import { Region } from '../../../interfaces';

export default class RegionGetCommand extends Command {
  static description = 'Get current region set for CLI';
  static examples = ['$ csdx config:get:region'];
  config: any;
  async run() {
    let currentRegion: Region = this.region;
    if (!currentRegion) {
      logger.error('No region set');
      cliux.error('CLI_CONFIG_GET_REGION_NOT_FOUND');
      this.exit();
    }
    cliux.print(`Currently using ${currentRegion.name} region`);
    cliux.print(`CDA HOST: ${currentRegion.cda}`);
    cliux.print(`CMA HOST: ${currentRegion.cma}`);
    cliux.print(`UI HOST: ${currentRegion.uiHost}`);
  }
}
