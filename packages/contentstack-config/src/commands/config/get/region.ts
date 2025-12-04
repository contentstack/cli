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
      this.logger.error('No region is set.');
      cliux.error('CLI_CONFIG_GET_REGION_NOT_FOUND');
      this.exit();
    }
    cliux.print(`Currently using the '${currentRegion.name}' region.`);
    cliux.print(`CDA host: ${currentRegion.cda}`);
    cliux.print(`CMA host: ${currentRegion.cma}`);
    cliux.print(`UI host: ${currentRegion.uiHost}`);
    cliux.print(`Developer Hub URL: ${currentRegion.developerHubUrl}`);
    cliux.print(`Launch URL: ${currentRegion.launchHubUrl}`);
    cliux.print(`Personalize URL: ${currentRegion.personalizeUrl}`);

  }
}
