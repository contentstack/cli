import { Command } from '@contentstack/cli-command';
import {
  cliux,
  printFlagDeprecation,
  flags as _flags,
  authHandler,
  FlagInput,
  ArgInput,
  args,
} from '@contentstack/cli-utilities';
import { Region } from '../../../interfaces';
import { regionHandler, interactive } from '../../../utils';
import { Args, BaseCommand } from '../../../base-command';

export default class RegionSetCommand extends BaseCommand<typeof RegionSetCommand> {
  config: any;
  static description = 'Set region for CLI';
  static flags: FlagInput = {
    cda: _flags.string({
      char: 'd',
      description:
        'Custom host to set for content delivery API, if this flag is added then cma, ui-host and name flags are required',
      dependsOn: ['cma', 'ui-host', 'name'],
      parse: printFlagDeprecation(['-d'], ['--cda']),
    }),
    cma: _flags.string({
      char: 'm',
      description:
        'Custom host to set for content management API, , if this flag is added then cda, ui-host and name flags are required',
      dependsOn: ['cda', 'ui-host', 'name'],
      parse: printFlagDeprecation(['-m'], ['--cma']),
    }),
    'ui-host': _flags.string({
      description: 'Custom UI host to set for CLI, if this flag is added then cda, cma and name flags are required',
      dependsOn: ['cda', 'cma', 'name'],
    }),
    name: _flags.string({
      char: 'n',
      description: 'Name for the region, if this flag is added then cda, cma and ui-host flags are required',
      dependsOn: ['cda', 'cma', 'ui-host'],
    }),
  };
  static examples = [
    '$ csdx config:set:region',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region EU',
    '$ csdx config:set:region AZURE-NA',
    '$ csdx config:set:region AZURE-EU',
    '$ csdx config:set:region GCP-NA',
    '$ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --ui-host <contentstack_ui_host_endpoint> --name "India"',
  ];

  static args: ArgInput = {
    region: args.string({ description: 'Name for the region' }),
  };

  async run() {
    const { args, flags: regionSetFlags } = await this.parse(RegionSetCommand);
    let cda = regionSetFlags.cda;
    let cma = regionSetFlags.cma;
    let name = regionSetFlags.name;
    let uiHost = regionSetFlags['ui-host'];
    let selectedRegion = args.region;
    if (!(cda && cma && uiHost && name) && !selectedRegion) {
      selectedRegion = await interactive.askRegions();
    }

    if (selectedRegion === 'custom') {
      const selectedCustomRegion = await interactive.askCustomRegion();
      name = selectedCustomRegion.name;
      cda = selectedCustomRegion.cda;
      cma = selectedCustomRegion.cma;
      uiHost = selectedCustomRegion.uiHost;
    } else if (selectedRegion === 'exit') {
      this.exit();
    }

    // Custom flag will get first priority over region argument
    if (cda && cma && uiHost && name) {
      try {
        let customRegion: Region = { cda, cma, uiHost, name };
        customRegion = regionHandler.setCustomRegion(customRegion);
        await authHandler.setConfigData('logout'); //Todo: Handle this logout flow well through logout command call
        cliux.success(`Custom region has been set to ${customRegion.name}`);
        cliux.success(`CMA HOST: ${customRegion.cma}`);
        cliux.success(`CDA HOST: ${customRegion.cda}`);
        cliux.success(`UI HOST: ${customRegion.uiHost}`);
      } catch (error) {
        this.logger.error('failed to set the region', error);
        cliux.error(`Failed to set region due to: ${error.message}`);
      }
    } else if (['NA', 'EU', 'AZURE-NA', 'AZURE-EU', 'GCP-NA'].includes(selectedRegion)) {
      const regionDetails: Region = regionHandler.setRegion(selectedRegion);
      await authHandler.setConfigData('logout'); //Todo: Handle this logout flow well through logout command call
      cliux.success(`Region has been set to ${regionDetails.name}`);
      cliux.success(`CDA HOST: ${regionDetails.cda}`);
      cliux.success(`CMA HOST: ${regionDetails.cma}`);
      cliux.success(`UI HOST: ${regionDetails.uiHost}`);
    } else {
      cliux.error(`Invalid region is given`);
    }
  }
}
