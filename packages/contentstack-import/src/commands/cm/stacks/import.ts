import { Command } from '@contentstack/cli-command';
import {
  messageHandler,
  printFlagDeprecation,
  managementSDKClient,
  flags,
  FlagInput,
  ContentstackClient,
  pathValidator,
  log,
  handleAndLogError,
  configHandler,
  getLogPath,
} from '@contentstack/cli-utilities';

import { Context, ImportConfig } from '../../../types';
import { ModuleImporter } from '../../../import';
import { setupImportConfig  } from '../../../utils';

export default class ImportCommand extends Command {
  static description = messageHandler.parse('Import content from a stack');

  static examples: string[] = [
    `csdx cm:stacks:import --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>`,
    `csdx cm:stacks:import --config <path/of/config/dir>`,
    `csdx cm:stacks:import --module <single module name>`,
    `csdx cm:stacks:import --module <single module name> --backup-dir <backup dir>`,
    `csdx cm:stacks:import --alias <management_token_alias>`,
    `csdx cm:stacks:import --alias <management_token_alias> --data-dir <path/of/export/destination/dir>`,
    `csdx cm:stacks:import --alias <management_token_alias> --config <path/of/config/file>`,
    `csdx cm:stacks:import --branch <branch name>  --yes --skip-audit`,
  ];

  static flags: FlagInput = {
    config: flags.string({
      char: 'c',
      description: '[optional] The path of the configuration JSON file containing all the options for a single run.',
    }),
    'stack-uid': flags.string({
      char: 's',
      description: 'API key of the target stack.',
      hidden: true,
      parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
    }),
    'stack-api-key': flags.string({
      char: 'k',
      description: 'API Key of the target stack',
    }),
    data: flags.string({
      description: 'path and location where data is stored',
      hidden: true,
      parse: printFlagDeprecation(['--data'], ['--data-dir']),
    }),
    'data-dir': flags.string({
      char: 'd',
      description: `The path or the location in your file system where the content, you intend to import, is stored. For example, -d "C:\\Users\\Name\\Desktop\\cli\\content". If the export folder has branches involved, then the path should point till the particular branch. For example, “-d "C:\\Users\\Name\\Desktop\\cli\\content\\branch_name"`,
    }),
    alias: flags.string({
      char: 'a',
      description: 'The management token of the destination stack where you will import the content.',
    }),
    'management-token-alias': flags.string({
      description: 'alias of the management token',
      hidden: true,
      parse: printFlagDeprecation(['--management-token-alias'], ['-a', '--alias']),
    }),
    'auth-token': flags.boolean({
      char: 'A',
      description: 'to use auth token',
      hidden: true,
      parse: printFlagDeprecation(['-A', '--auth-token']),
    }),
    module: flags.string({
      required: false,
      char: 'm',
      description:
        '[optional] Specify the module to import into the target stack. If not specified, the import command will import all the modules into the stack. The available modules are assets, content-types, entries, environments, extensions, marketplace-apps, global-fields, labels, locales, webhooks, workflows, custom-roles, and taxonomies.',
      parse: printFlagDeprecation(['-m'], ['--module']),
    }),
    'backup-dir': flags.string({
      char: 'b',
      description: '[optional] Backup directory name when using specific module.',
      parse: printFlagDeprecation(['-b'], ['--backup-dir']),
    }),
    branch: flags.string({
      char: 'B',
      description:
        "The name of the branch where you want to import your content. If you don't mention the branch name, then by default the content will be imported to the main branch.",
      parse: printFlagDeprecation(['-B'], ['--branch']),
    }),
    'import-webhook-status': flags.string({
      description:
        '[default: disable] (optional) This webhook state keeps the same state of webhooks as the source stack. <options: disable|current>',
      options: ['disable', 'current'],
      required: false,
      default: 'disable',
    }),
    yes: flags.boolean({
      char: 'y',
      required: false,
      description: '[optional] Force override all Marketplace prompts.',
    }),
    'skip-app-recreation': flags.boolean({
      description: '(optional) Skips the recreation of private apps if they already exist.',
      parse: printFlagDeprecation(['--skip-app-recreation']),
    }),
    'replace-existing': flags.boolean({
      required: false,
      description: 'Replaces the existing module in the target stack.',
    }),
    'skip-existing': flags.boolean({
      required: false,
      default: false,
      description: 'Skips the module exists warning messages.',
    }),
    'personalize-project-name': flags.string({
      required: false,
      description: '(optional) Provide a unique name for the Personalize project.',
    }),
    'skip-audit': flags.boolean({
      description: 'Skips the audit fix that occurs during an import operation.',
    }),
    'exclude-global-modules': flags.boolean({
      description: 'Excludes the branch-independent module from the import operation.',
      default: false,
    }),
    'skip-assets-publish': flags.boolean({
      description: 'Skips asset publishing during the import process.',
      default: false,
    }),
    'skip-entries-publish': flags.boolean({
      description: 'Skips entry publishing during the import process',
      default: false,
    }),
  };

  static aliases: string[] = ['cm:import'];

  static usage: string =
    'cm:stacks:import [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--backup-dir <value>] [--branch <value>] [--import-webhook-status disable|current]';

  async run(): Promise<void> {
    // setup import config
    // initialize the importer
    // start import
    let backupDir: string;
    try {
      const { flags } = await this.parse(ImportCommand);
      let importConfig: ImportConfig = await setupImportConfig(flags);
      // Prepare the context object
      const context = this.createImportContext(importConfig.apiKey);
      importConfig.context = {...context};
      log.info(`Using Cli Version: ${this.context?.plugin?.version}`, importConfig.context);
      
      // Note setting host to create cma client
      importConfig.host = this.cmaHost;
      importConfig.region = this.region;
      if (this.developerHubUrl) importConfig.developerHubBaseUrl = this.developerHubUrl;
      if (this.personalizeUrl) importConfig.modules.personalize.baseURL[importConfig.region.name] = this.personalizeUrl;
      backupDir = importConfig.cliLogsPath || importConfig.backupDir;

      const managementAPIClient: ContentstackClient = await managementSDKClient(importConfig);

      if (!flags.branch) {
        try {
          const branches = await managementAPIClient
            .stack({ api_key: importConfig.apiKey })
            .branch()
            .query()
            .find()
            .then(({ items }: any) => items);
          if (branches.length) {
            flags.branch = 'main';
          }
        } catch (error) {
          // Branch not enabled, just the let flow continue
        }
      }
      const moduleImporter = new ModuleImporter(managementAPIClient, importConfig);
      const result = await moduleImporter.start();

      if (!result?.noSuccessMsg) {       
        const successMessage = importConfig.stackName
        ? `Successfully imported the content to the stack named ${importConfig.stackName} with the API key ${importConfig.apiKey} .`
        : `The content has been imported to the stack ${importConfig.apiKey} successfully!`;
        log.success(successMessage, importConfig.context);
      }

      log.success(`The log has been stored at '${getLogPath()}'`, importConfig.context)
    } catch (error) {
      handleAndLogError(error);
      log.info(`The log has been stored at '${getLogPath()}'`)
    }
  }

  // Create export context object
  private createImportContext(apiKey: string): Context {
    return {
      command: this.context.info.command,
      module: '',
      userId: configHandler.get('userId'),
      email: configHandler.get('email'),
      sessionId: this.context.sessionId,
      apiKey: apiKey || '',
      orgId: configHandler.get('organization_uid') || '',
      authMethod: this.context.authMethod || 'Basic Auth',
    };
  }
}
