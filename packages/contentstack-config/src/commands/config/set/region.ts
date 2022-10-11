import { Command, flags } from '@contentstack/cli-command';
import { cliux, logger, printFlagDeprecation } from '@contentstack/cli-utilities';
import { Region } from '../../../interfaces';
import { regionHandler, interactive } from '../../../utils';

export default class RegionSetCommand extends Command {
  config: any;
  static description = 'Set region for CLI';
  static flags = {
    cda: flags.string({
      char: 'd',
      description:
        'Custom host to set for content delivery API, if this flag is added then cma and name flags are required',
      dependsOn: ['cma', 'name'],
      parse: printFlagDeprecation(['-d'], ['--cda']),
    }),
    cma: flags.string({
      char: 'm',
      description:
        'Custom host to set for content management API, , if this flag is added then cda and name flags are required',
      dependsOn: ['cda', 'name'],
      parse: printFlagDeprecation(['-m'], ['--cma']),
    }),
    name: flags.string({
      char: 'n',
      description: 'Name for the region, if this flag is added then cda and cma flags are required',
      dependsOn: ['cda', 'cma'],
    }),
  };
  static examples = [
    '$ csdx config:set:region',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"',
  ];

  static args = [
    {
      name: 'region',
    },
  ];

  async run() {
    const { args, flags: regionSetFlags } = this.parse(RegionSetCommand);
    let cda = regionSetFlags.cda;
    let cma = regionSetFlags.cma;
    let name = regionSetFlags.name;
    let selectedRegion = args.region;
    if (!(cda && cma && name) && !selectedRegion) {
      selectedRegion = await interactive.askRegions();
    }

    if (selectedRegion === 'custom') {
      const selectedCustomRegion = await interactive.askCustomRegion();
      name = selectedCustomRegion.name;
      cda = selectedCustomRegion.cda;
      cma = selectedCustomRegion.cma;
    } else if (selectedRegion === 'exit') {
      this.exit();
    }

    // Custom flag will get first priority over region argument
    if (cda && cma && name) {
      try {
        let customRegion: Region = { cda, cma, name };
        customRegion = regionHandler.setCustomRegion(customRegion);
        cliux.success(`Custom region has been set to ${customRegion.name}`);
        cliux.success(`CMA HOST: ${customRegion.cma}`);
        cliux.success(`CDA HOST: ${customRegion.cda}`);
      } catch (error) {
        logger.error('failed to set the region', error);
        cliux.error(`Failed to set region due to: ${error.message}`);
      }
    } else if (['NA', 'EU', 'AZURE-NA'].includes(selectedRegion)) {
      const regionDetails: Region = regionHandler.setRegion(selectedRegion);
      cliux.success(`Region has been set to ${regionDetails.name}`);
      cliux.success(`CDA HOST: ${regionDetails.cda}`);
      cliux.success(`CMA HOST: ${regionDetails.cma}`);
    } else {
      cliux.error(`Invalid region is given`);
    }
  }
}
