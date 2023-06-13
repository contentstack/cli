/* eslint-disable complexity */
const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, configHandler, flags, isAuthenticated, cliux } = require('@contentstack/cli-utilities');
const {
  configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken,
} = require('../../../lib/util/export-flags');
const config = require('../../../config/default');

class ExportCommand extends Command {
  async run() {
    const { flags: exportCommandFlags } = await this.parse(ExportCommand);
    const extConfig = exportCommandFlags.config;
    const sourceStack = exportCommandFlags['stack-uid'] || exportCommandFlags['stack-api-key'];
    const alias = exportCommandFlags['alias'] || exportCommandFlags['management-token-alias'];
    const securedAssets = exportCommandFlags['secured-assets'];
    const data = exportCommandFlags.data || exportCommandFlags['data-dir'];
    const moduleName = exportCommandFlags.module;
    const contentTypes = exportCommandFlags['content-types'];
    const branchName = exportCommandFlags.branch;
    let host = this.region;
    let cmaHost = host.cma.split('//');
    let cdaHost = host.cda.split('//');
    host.cma = cmaHost[1];
    host.cda = cdaHost[1];
    exportCommandFlags['isAuthenticated'] = isAuthenticated();

    config.forceStopMarketplaceAppsPrompt = exportCommandFlags.yes;

    if (alias) {
      const managementTokens = this.getToken(alias);
      const listOfTokens = configHandler.get('tokens');
      config.management_token_data = listOfTokens[alias];

      if (managementTokens) {
        if (extConfig) {
          await configWithMToken(
            extConfig,
            managementTokens,
            host,
            contentTypes,
            branchName,
            securedAssets,
            moduleName,
            data,
            exportCommandFlags,
          );
        } else if (data) {
          await parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            contentTypes,
            branchName,
            securedAssets,
            exportCommandFlags,
          );
        } else if (data === undefined && sourceStack === undefined) {
          await withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            contentTypes,
            branchName,
            securedAssets,
            exportCommandFlags,
          );
        } else {
          cliux.print(`error: Please provide a valid command. Run "csdx cm:export --help" command to view the command usage`, {color: 'red'});
        }
      } else {
        cliux.print(`error: ${alias} management token is not present, please add managment token first`, {color: 'red'});
      }
    } else if (isAuthenticated()) {
      if (extConfig) {
        await configWithAuthToken(
          extConfig,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets,
          exportCommandFlags,
        );
      } else if (sourceStack && data) {
        return await parametersWithAuthToken(
          sourceStack,
          data,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets,
          exportCommandFlags,
        );
      } else if (data === undefined && sourceStack === undefined) {
        await withoutParametersWithAuthToken(
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets,
          exportCommandFlags,
        );
      } else {
        cliux.print(`error: Please provide a valid command. Run "csdx cm:export --help" command to view the command usage`, {color: 'red'});
      }
    } else {
      cliux.print(`error: Login or provide the alias for management token`, {color: 'red'});
    }
  }
}

ExportCommand.description = `Export content from a stack`;
ExportCommand.examples = [
  'csdx cm:stacks:export --stack-api-key <stack_api_key> --data-dir <path/of/export/destination/dir>',
  'csdx cm:stacks:export --config <path/to/config/dir>',
  'csdx cm:stacks:export --alias <management_token_alias>',
  'csdx cm:stacks:export --alias <management_token_alias> --data-dir <path/to/export/destination/dir>',
  'csdx cm:stacks:export --alias <management_token_alias> --config <path/to/config/file>',
  'csdx cm:stacks:export --module <single module name>',
  'csdx cm:stacks:export --branch [optional] branch name',
];
ExportCommand.usage =
  'cm:stacks:export [-c <value>] [-k <value>] [-d <value>] [-a <value>] [--module <value>] [--content-types <value>] [--branch <value>] [--secured-assets]';

ExportCommand.flags = {
  config: flags.string({
    char: 'c',
    description: '[optional] path of the config',
  }),
  'stack-uid': flags.string({
    char: 's',
    description: 'API key of the source stack',
    hidden: true,
    parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the source stack',
  }),
  data: flags.string({
    description: 'path or location to store the data',
    hidden: true,
    parse: printFlagDeprecation(['--data'], ['--data-dir']),
  }),
  'data-dir': flags.string({
    char: 'd',
    description: 'path or location to store the data',
  }),
  alias: flags.string({
    char: 'a',
    description: 'alias of the management token',
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
    char: 'm',
    description: '[optional] specific module name',
    exclusive: ['content-types'],
    parse: printFlagDeprecation(['-m'], ['--module']),
  }),
  'content-types': flags.string({
    char: 't',
    description: '[optional] content type',
    multiple: true,
    exclusive: ['module'],
    parse: printFlagDeprecation(['-t'], ['--content-types']),
  }),
  branch: flags.string({
    char: 'B',
    // default: 'main',
    description: '[optional] branch name',
    parse: printFlagDeprecation(['-B'], ['--branch']),
  }),
  'secured-assets': flags.boolean({
    description: '[optional] use when assets are secured',
  }),
  yes: flags.boolean({
    char: 'y',
    required: false,
    description: '[optional] Override marketplace apps related prompts',
  }),
};

ExportCommand.aliases = ['cm:export'];

module.exports = ExportCommand;
