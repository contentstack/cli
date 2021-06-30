import { Command } from '@contentstack/cli-command';
import { Region } from '../../../interfaces';
import { cliux, logger, messageHandler } from '../../../utils';

export default class RegionGetCommand extends Command {
  private region: Region;
  private exit: Function;
  static run: Function;
  static description = messageHandler.parse('CLI_CONFIG_SET_REGION_DESCRIPTION');
  static examples = ['$ csdx config:get:region'];

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
  }
}
