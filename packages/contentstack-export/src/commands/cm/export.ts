import { Command, flags } from '@contentstack/cli-command';
import { logger, cliux, messageHandler, CLIError, configHandler } from '@contentstack/cli-utilities';
import { ModuleExporter } from '../../export';
import { setupExportConfig } from '../../utils';

export default class ExportCommand extends Command {
  managementAPIClient: any;
  private readonly parse: Function;
  private cmaHost: string;
  authToken: string;
  private exit: Function;
  static run;
  context: any;

  static description = messageHandler.parse('Export content from a stack');

  static examples = [
    'csdx cm:export',
    'csdx cm:export -k <stack_ApiKey> -d <path/of/export/destination/dir>',
    'csdx cm:export -m <single module name>',
    'csdx cm:export -m <single module name> -k <stack_ApiKey> -d <path/of/export/destination/dir>',
    'csdx cm:export -m <single module name> -t <content type>',
    'csdx cm:export -b [optional] branch name',
    'csdx cm:export -c <path/to/config/dir>',
    'csdx cm:export -a <management_token_alias>',
    'csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>',
    'csdx cm:export -a <management_token_alias> -c <path/to/config/file>',
  ];

  static flags = {
    'external-config-path': flags.string({ char: 'c', description: '[optional] path of the config' }),
    'api-key': flags.string({ char: 'k', description: 'API key of the source stack' }),
    'export-dir': flags.string({ char: 'd', description: 'path or location to store the data' }),
    'mtoken-alias': flags.string({ char: 'a', description: 'alias of the management token' }),
    module: flags.string({ char: 'm', description: '[optional] specific module name' }),
    'content-type': flags.string({ char: 't', description: '[optional] content type', multiple: true }),
    branch: flags.string({ char: 'b', description: '[optional] branch name' }),
  };

  async run(): Promise<any> {
    // setup export config
    // initialize the exporter
    // start export
    try {
      this.managementAPIClient = { host: this.cmaHost, authtoken: this.authToken };
      const exportConfig = await setupExportConfig(this.context, this.parse(ExportCommand).flags);
      const moduleExpoter = new ModuleExporter(this.context, this.managementAPIClient, exportConfig);
      await moduleExpoter.start();
      console.log('done');
    } catch (error) {
      logger.error('Failed to export the content', error);
      cliux.error('Failed to export content', error.message);
    }
  }
}
