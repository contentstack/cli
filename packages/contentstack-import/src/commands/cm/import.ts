import { Command, flags } from '@contentstack/cli-command';
import { logger, cliux, messageHandler, CLIError, configHandler } from '@contentstack/cli-utilities';
import { ModuleImporter } from '../../import';
import { setupImportConfig } from '../../utils';

export default class ImportCommand extends Command {
  managementAPIClient: any;
  private readonly parse: Function;
  private cmaHost: string;
  authToken: string;
  private exit: Function;
  static run;
  context: any;

  static description = messageHandler.parse('Import content from a stack');

  static examples = [
    'csdx cm:import -A',
    'csdx cm:import -A -s <stack_ApiKey> -d <path/of/content/dir>',
    'csdx cm:import -A -c <path/of/config/dir>',
    'csdx cm:import -A -m <single module name>',
    'csdx cm:import -A -m <single module name> -b <backup dir>',
    'csdx cm:import -a <management_token_alias>',
    'csdx cm:import -a <management_token_alias> -d <path/of/content/destination/dir>',
    'csdx cm:import -a <management_token_alias> -c <path/of/config/file>',
    'csdx cm:import -A -m <single module name>',
    'csdx cm:import -A -B <branch name>',
  ];

  static flags = {
    'external-config': flags.string({ char: 'c', description: '[optional] path of the config' }),
    'api-key': flags.string({ char: 'k', description: 'API key of the source stack' }),
    'content-dir': flags.string({ char: 'd', description: 'path or location to store the data' }),
    'mtoken-alias': flags.string({ char: 'a', description: 'alias of the management token' }),
    'auth-token': flags.boolean({ char: 'A', description: 'to use auth token' }),
    module: flags.string({ char: 'm', description: '[optional] specific module name' }),
    'content-type': flags.string({ char: 't', description: '[optional] content type', multiple: true }),
    branch: flags.string({ char: 'b', description: '[optional] branch name' }),
    'backup-dir': flags.string({ description: '[optional] backup directory name when using specific module' }),
  };

  async run(): Promise<any> {
    // setup import config
    // initialize the importer
    // start import
    try {
      this.managementAPIClient = { host: this.cmaHost, authtoken: this.authToken };
      const importConfig = await setupImportConfig(this.context, this.parse(ImportCommand));
      const moduleImporter = new ModuleImporter(this.context, this.managementAPIClient, importConfig);
      await moduleImporter.start();
      console.log('done');
    } catch (error) {
      logger.error('Failed to import the content', error);
      cliux.error('Failed to import content', error.message);
    }
  }
}
