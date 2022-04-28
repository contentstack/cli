import { Command, flags } from '@contentstack/cli-command';
import { cliux, logger, messageHandler, printFlagDeprecation } from '@contentstack/cli-utilities';
import { Region } from '../../../interfaces';
import { regionHandler, interactive } from '../../../utils';

export default class RegionSetCommand extends Command {
  config: any;
  static description = messageHandler.parse('CLI_CONFIG_SET_REGION_DESCRIPTION');
  static flags = {
    cda: flags.string({
      char: 'd',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_D_DESCRIPTION'),
      dependsOn: ['cma', 'name'],
      parse: printFlagDeprecation(['-d'], ['--cda']),
    }),
    cma: flags.string({
      char: 'm',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_M_DESCRIPTION'),
      dependsOn: ['cda', 'name'],
      parse: printFlagDeprecation(['-m'], ['--cma']),
    }),
    name: flags.string({
      char: 'n',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_N_DESCRIPTION'),
      dependsOn: ['cda', 'cma'],
    }),
  };
  static examples = [
    '$ csdx config:set:region',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"',
    '$ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" --name="India"',
  ];

  static args = [
    {
      name: 'region',
    },
  ];

  async run() {
    const { args, flags } = this.parse(RegionSetCommand);
    let cda = flags.cda;
    let cma = flags.cma;
    let name = flags.name;
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
    } else if (selectedRegion === 'NA' || selectedRegion === 'EU') {
      const regionDetails: Region = regionHandler.setRegion(selectedRegion);
      cliux.success(`Region has been set to ${regionDetails.name}`);
      cliux.success(`CDA HOST: ${regionDetails.cda}`);
      cliux.success(`CMA HOST: ${regionDetails.cma}`);
    } else {
      cliux.error(`Invalid region is given`);
    }
  }
}
