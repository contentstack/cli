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
    'developer-hub': _flags.string({
      description: 'Custom host to set for Developer hub API',
    }),
    personalize: _flags.string({
      description: 'Custom host to set for Personalize API',
    }),
    launch: _flags.string({
      description: 'Custom host to set for Launch API',
    }),
  };
  static examples = [
    '$ csdx config:set:region',
    '$ csdx config:set:region NA',
    '$ csdx config:set:region EU',
    '$ csdx config:set:region AWS-NA',
    '$ csdx config:set:region AWS-EU',
    '$ csdx config:set:region AZURE-NA',
    '$ csdx config:set:region AZURE-EU',
    '$ csdx config:set:region GCP-NA',
    '$ csdx config:set:region GCP-EU',
    '$ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India"',
    '$ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url>',
    '$ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --personalize <custom_personalize_url>',
    '$ csdx config:set:region --cma <custom_cma_host_url> --cda <custom_cda_host_url> --ui-host <custom_ui_host_url> --name "India" --launch <custom_launch_url>',
    '$ csdx config:set:region --cda <custom_cda_host_url> --cma <custom_cma_host_url> --ui-host <custom_ui_host_url> --name "India" --developer-hub <custom_developer_hub_url> --launch <custom_launch_url> --personalize <custom_personalize_url>',
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
    let developerHubUrl = regionSetFlags['developer-hub'];
    let personalizeUrl = regionSetFlags['personalize'];
    let launchHubUrl = regionSetFlags['launch'];
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
        if (!developerHubUrl) {
          developerHubUrl = this.transformUrl(cma, 'developerhub-api');
        }
        if (!launchHubUrl) {
          launchHubUrl = this.transformUrl(cma, 'launch-api');
        }
        if (!personalizeUrl) {
          personalizeUrl = this.transformUrl(cma, 'personalize-api');
        }
        let customRegion: Region = { cda, cma, uiHost, name, developerHubUrl, personalizeUrl, launchHubUrl };
        customRegion = regionHandler.setCustomRegion(customRegion);
        await authHandler.setConfigData('logout'); //Todo: Handle this logout flow well through logout command call
        cliux.success(`Custom region has been set to ${customRegion.name}`);
        cliux.success(`CMA HOST: ${customRegion.cma}`);
        cliux.success(`CDA HOST: ${customRegion.cda}`);
        cliux.success(`UI HOST: ${customRegion.uiHost}`);
        cliux.success(`Developer Hub URL: ${customRegion.developerHubUrl}`);
        cliux.success(`Personalize URL: ${customRegion.personalizeUrl}`);
        cliux.success(`Launch URL: ${customRegion.launchHubUrl}`);
      } catch (error) {
        this.logger.error('failed to set the region', error);
        cliux.error(`Failed to set region due to: ${error.message}`);
      }
    } else if (['NA', 'EU', 'AWS-NA', 'AWS-EU', 'AZURE-NA', 'AZURE-EU', 'GCP-NA', 'GCP-EU'].includes(selectedRegion)) {
      const regionDetails: Region = regionHandler.setRegion(selectedRegion);
      await authHandler.setConfigData('logout'); //Todo: Handle this logout flow well through logout command call
      cliux.success(`Region has been set to ${regionDetails.name}`);
      cliux.success(`CDA HOST: ${regionDetails.cda}`);
      cliux.success(`CMA HOST: ${regionDetails.cma}`);
      cliux.success(`UI HOST: ${regionDetails.uiHost}`);
      cliux.success(`Developer Hub URL: ${regionDetails.developerHubUrl}`);
      cliux.success(`Personalize URL: ${regionDetails.personalizeUrl}`);
      cliux.success(`Launch URL: ${regionDetails.launchHubUrl}`);
    } else {
      cliux.error(`Invalid region is given`);
    }
  }
  transformUrl(url: string, replacement: string): string {
    let transformedUrl = url.replace('api', replacement);
    if (transformedUrl.startsWith('http')) {
      transformedUrl = transformedUrl.split('//')[1];
    }
    transformedUrl = transformedUrl.replace(/^dev\d+/, 'dev') // Replaces any 'dev1', 'dev2', etc. with 'dev'
    transformedUrl = transformedUrl.endsWith('io') ? transformedUrl.replace('io', 'com') : transformedUrl;
    return `https://${transformedUrl}`;
  }
}
