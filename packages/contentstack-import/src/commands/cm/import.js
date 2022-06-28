const {Command, flags} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
let _ = require('lodash')
const Configstore  = require('configstore')
const credStore = new Configstore('contentstack_cli')
const {configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken
} = require('../../lib/util/import-flags')

class ImportCommand extends Command {
  async run() {
    let self = this
    const importCommandFlags = self.parse(ImportCommand).flags
    const extConfig = importCommandFlags.config
    let targetStack = importCommandFlags['stack-uid']
    const data = importCommandFlags.data
    const moduleName = importCommandFlags.module
    const backupdir = importCommandFlags["backup-dir"]
    const alias = importCommandFlags['management-token-alias']
    const authToken = importCommandFlags['auth-token']
    let _authToken = credStore.get('authtoken')
    let branchName = importCommandFlags.branch
    let host = self.cmaHost
    
  return new Promise(function (resolve, reject) {  
    if (alias) {
      let managementTokens = self.getToken(alias)

      if (managementTokens) {
        if (extConfig && _authToken) {
          configWithMToken(
            extConfig,
            managementTokens,
            moduleName,
            host,
            _authToken,
            backupdir,
            branchName
          )
          .then(() => {
            return resolve()
          })
        } else if (data) {
          parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            _authToken,
            backupdir,
            branchName
          )
          .then(() => {
            return resolve()
          })
        } else {
          withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            _authToken,
            backupdir,
            branchName
          )
          .then(() => {
            return resolve()
          })
        } 
      } else {
        console.log('management Token is not present please add managment token first')
      }
    } else if (authToken && _authToken) {
      if (extConfig) {
        configWithAuthToken(
          extConfig,
          _authToken,
          moduleName,
          host,
          backupdir,
          branchName
        )
        .then(() => {
          return resolve()
        })
      } else if (targetStack && data) {
        parametersWithAuthToken(
          _authToken,
          targetStack,
          data,
          moduleName,
          host,
          backupdir,
          branchName
        )
        .then(() => {
          return resolve()
        })
      } else {
        withoutParametersWithAuthToken(
          _authToken,
          moduleName,
          host,
          backupdir,
          branchName
        )
        .then(() => {
          return resolve()
        })
        .catch(error => {
          return reject(error);
        });
      }
    } else  {
      console.log('Provide alias for managementToken or authtoken')
    }
  })
}
}

ImportCommand.description = `Import script for importing the content into new stack
...
Once you export content from the source stack, import it to your destination stack by using the cm:import command.
`
ImportCommand.examples = [
  `csdx cm:import -A`, 
  `csdx cm:import -A -s <stack_ApiKey> -d <path/of/export/destination/dir>`,
  `csdx cm:import -A -c <path/of/config/dir>`,
  `csdx cm:import -A -m <single module name>`,
  `csdx cm:import -A -m <single module name> -b <backup dir>`,
  `csdx cm:import -a <management_token_alias>`,
  `csdx cm:import -a <management_token_alias> -d <path/of/export/destination/dir>`,
  `csdx cm:import -a <management_token_alias> -c <path/of/config/file>`,
  `csdx cm:import -A -m <single module name>`,
  `csdx cm:import -A -B <branch name>`,
]
ImportCommand.flags = {
  config: flags.string({
    char: 'c', 
    description: '[optional] path of config file'
  }),
  'stack-uid': flags.string({
    char: 's', 
    description: 'API key of the target stack'
  }),
  data: flags.string({
    char: 'd', 
    description: 'path and location where data is stored'
  }),
  'management-token-alias': flags.string({
    char: 'a', 
    description: 'alias of the management token'
  }),
  'auth-token': flags.boolean({
    char: 'A', 
    description: 'to use auth token'
  }),
  module: flags.string({
    char: 'm', 
    description: '[optional] specific module name'
  }),
  "backup-dir": flags.string({
    char: 'b', 
    description: '[optional] backup directory name when using specific module'
  }),
  'branch': flags.string({
    char: 'B', 
    description: '[optional] branch name'
  })
}

module.exports = ImportCommand