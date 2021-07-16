import { Command, flags } from '@oclif/command';
import * as Config from '@oclif/config';
import { cliux, logger, messageHandler } from '../../../utils';
import { Region } from '../../../interfaces';

export default class RegionSetCommand extends Command {
  config: any;
  static description = messageHandler.parse('CLI_CONFIG_SET_REGION_DESCRIPTION');
  static flags = {
    cda: flags.string({
      char: 'd',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_D_DESCRIPTION'),
      dependsOn: ['cma', 'name'],
    }),
    cma: flags.string({
      char: 'm',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_M_DESCRIPTION'),
      dependsOn: ['cda', 'name'],
    }),
    name: flags.string({
      char: 'n',
      description: messageHandler.parse('CLI_CONFIG_SET_REGION_FLAG_N_DESCRIPTION'),
      dependsOn: ['cda', 'cma'],
    }),
  };
  static examples = [
    '$ csdx config:set:region EU',
    '$ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"',
    '$ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" --name="India"',
  ];

  async run() {
    const { args, flags } = this.parse(RegionSetCommand);
    const { cda, cma, name } = flags;
    // Custom flag will get first priority over region argument
    if (cda && cma && name) {
      try {
        let customRegion: Region = { cda, cma, name };
        customRegion = this.config.userConfig.setCustomRegion(customRegion);
        cliux.success(`Custom region has been set to ${customRegion.name}`);
        cliux.success(`CMA HOST: ${customRegion.cma}`);
        cliux.success(`CDA HOST: ${customRegion.cda}`);
      } catch (error) {
        logger.error('failed to set the region', error);
        cliux.error(`Failed to set region due to: ${error.message}`);
      }
    } else if (args.region) {
      const selectedRegion: string = args.region;
      const regionDetails: Region = this.config.userConfig.setRegion(selectedRegion);
      cliux.success(`Region has been set to ${regionDetails.name}`);
      cliux.success(`CDA HOST: ${regionDetails.cda}`);
      cliux.success(`CMA HOST: ${regionDetails.cma}`);
    } else {
      this.config.userConfig.setRegion('NA');
      cliux.print('CLI_CONFIG_SET_REGION_DEFAULT');
    }
  }
}
