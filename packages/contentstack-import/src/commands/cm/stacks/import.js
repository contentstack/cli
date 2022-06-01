const { Command, flags } = require('@contentstack/cli-command');
let _ = require('lodash');
const { configHandler } = require('@contentstack/cli-utilities');
const {
  configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken,
} = require('../../../lib/util/import-flags');
const { printFlagDeprecation } = require('@contentstack/cli-utilities');

class ImportCommand extends Command {
  async run() {
    let self = this;
    const importCommandFlags = self.parse(ImportCommand).flags;
    const extConfig = importCommandFlags.config;
    let targetStack = importCommandFlags['stack-uid'] || importCommandFlags['stack-api-key'];
    const data = importCommandFlags.data || importCommandFlags['data-dir'];
    const moduleName = importCommandFlags.module;
    const backupdir = importCommandFlags['backup-dir'];
    const alias = importCommandFlags['management-token-alias'];
    let _authToken = configHandler.get('authtoken');
    let branchName = importCommandFlags.branch;
    let host = self.cmaHost;

    return new Promise(function (resolve, _reject) {
      if (alias) {
        let managementTokens = self.getToken(alias);

        if (managementTokens) {
          if (extConfig && _authToken) {
            configWithMToken(extConfig, managementTokens, moduleName, host, _authToken, branchName, backupdir).then(
              () => {
                return resolve();
              },
            );
          } else if (data) {
            parameterWithMToken(managementTokens, data, moduleName, host, _authToken, branchName, backupdir).then(
              () => {
                return resolve();
              },
            );
          } else {
            withoutParameterMToken(managementTokens, moduleName, host, _authToken, branchName, backupdir).then(() => {
              return resolve();
            });
          }
        } else {
          console.log('management Token is not present please add managment token first');
        }
      } else if (_authToken) {
        if (extConfig) {
          configWithAuthToken(extConfig, _authToken, moduleName, host, branchName, backupdir).then(() => {
            return resolve();
          });
        } else if (targetStack && data) {
          parametersWithAuthToken(_authToken, targetStack, data, moduleName, host, backupdir, branchName).then(() => {
            return resolve();
          });
        } else {
          withoutParametersWithAuthToken(_authToken, moduleName, host, backupdir, branchName).then(() => {
            return resolve();
          });
        }
      } else {
        console.log('Login or provide the alias for management token');
      }
    });
  }
}

ImportCommand.description = `Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:stacks:import command.
`;
ImportCommand.examples = [
  `csdx cm:stacks:import -s <stack_ApiKey> -d <path/of/export/destination/dir>`,
  `csdx cm:stacks:import -c <path/of/config/dir>`,
  `csdx cm:stacks:import -m <single module name>`,
  `csdx cm:stacks:import -m <single module name> -b <backup dir>`,
  `csdx cm:stacks:import -a <management_token_alias>`,
  `csdx cm:stacks:import -a <management_token_alias> -d <path/of/export/destination/dir>`,
  `csdx cm:stacks:import -a <management_token_alias> -c <path/of/config/file>`,
  `csdx cm:stacks:import -m <single module name>`,
  `csdx cm:stacks:import -B <branch name>`,
];
ImportCommand.flags = {
  config: flags.string({
    char: 'c',
    description: '[optional] path of config file',
  }),
  'stack-uid': flags.string({
    char: 's',
    description: 'API key of the target stack',
    parse: printFlagDeprecation(['-s', '--stack-uid'], ['-k', '--stack-api-key']),
  }),
  'stack-api-key': flags.string({
    char: 'k',
    description: 'API key of the target stack',
  }),
  data: flags.string({
    char: 'd',
    description: 'path and location where data is stored',
    parse: printFlagDeprecation(['--data'], ['--data-dir']),
  }),
  'data-dir': flags.string({
    description: 'path and location where data is stored',
  }),
  'management-token-alias': flags.string({
    char: 'a',
    description: 'alias of the management token',
  }),
  'auth-token': flags.boolean({
    char: 'A',
    description: 'to use auth token',
    parse: printFlagDeprecation(['-A', '--auth-token']),
  }),
  module: flags.string({
    char: 'm',
    description: '[optional] specific module name',
  }),
  'backup-dir': flags.string({
    char: 'b',
    description: '[optional] backup directory name when using specific module',
  }),
  branch: flags.string({
    char: 'B',
    description: '[optional] branch name',
  }),
};

ImportCommand.aliases = ['cm:import'];

module.exports = ImportCommand;
