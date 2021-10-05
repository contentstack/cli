/* eslint-disable complexity */
const { Command, flags } = require('@contentstack/cli-command')
const { configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken,
} = require('../../lib/util/export-flags')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')

class ExportCommand extends Command {
  async run() {
    const exportCommandFlags = this.parse(ExportCommand).flags
    const extConfig = exportCommandFlags.config
    let sourceStack = exportCommandFlags['stack-uid']
    const alias = exportCommandFlags['management-token-alias']
    const authToken = exportCommandFlags['auth-token']
    const securedAssets = exportCommandFlags['secured-assets']
    const data = exportCommandFlags.data
    const moduleName = exportCommandFlags.module
    const contentTypes = exportCommandFlags['content-type']
    const branchName = exportCommandFlags.branch;
    let _authToken = credStore.get('authtoken')
    let host = this.region
    let cmaHost = host.cma.split('//')
    let cdaHost = host.cda.split('//')
    host.cma = cmaHost[1]
    host.cda = cdaHost[1]

    if (alias) {
      let managementTokens = this.getToken(alias)
      if (managementTokens) {
        if (extConfig) {
          configWithMToken(
            extConfig,
            managementTokens,
            host,
            contentTypes,
            branchName,
            securedAssets
          )
        } else if (data) {
          parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            _authToken,
            contentTypes,
            branchName,
            securedAssets
          )
        } else if (data === undefined && sourceStack === undefined) {
          withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            _authToken,
            contentTypes,
            branchName,
            securedAssets
          )
        } else {
          this.log('Please provide a valid command. Run "csdx cm:export --help" command to view the command usage')
        }
      } else {
        this.log(alias + ' management token is not present, please add managment token first')
      }
    } else if (authToken && _authToken) {
      if (extConfig) {
        configWithAuthToken(
          extConfig,
          _authToken,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        )
      } else if (sourceStack && data) {
        return parametersWithAuthToken(
          _authToken,
          sourceStack,
          data,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        )
      } else if (data === undefined && sourceStack === undefined) {
        withoutParametersWithAuthToken(
          _authToken,
          moduleName,
          host,
          contentTypes,
          branchName,
          securedAssets
        )
      } else {
        this.log('Please provide a valid command. Run "csdx cm:export --help" command to view the command usage')
      }
    } else {
      this.log('Provide the alias for management token or auth token')
    }
    // return
  }
}

ExportCommand.description = `Export content from a stack
...
Export content from one stack to another
`
ExportCommand.examples = [
  'csdx cm:export -A',
  'csdx cm:export -A -s <stack_ApiKey> -d <path/of/export/destination/dir>',
  'csdx cm:export -A -c <path/to/config/dir>',
  'csdx cm:export -A -m <single module name>',
  'csdx cm:export -A --secured-assets',
  'csdx cm:export -a <management_token_alias>',
  'csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>',
  'csdx cm:export -a <management_token_alias> -c <path/to/config/file>',
  'csdx cm:export -A -m <single module name>',
  'csdx cm:export -A -m <single module name> -t <content type>',
  'csdx cm:export -A -B [optional] branch name',
]

ExportCommand.flags = {
  config: flags.string({ char: 'c', description: '[optional] path of the config' }),
  'stack-uid': flags.string({ char: 's', description: 'API key of the source stack' }),
  data: flags.string({ char: 'd', description: 'path or location to store the data' }),
  'management-token-alias': flags.string({ char: 'a', description: 'alias of the management token' }),
  'auth-token': flags.boolean({ char: 'A', description: 'to use auth token' }),
  module: flags.string({ char: 'm', description: '[optional] specific module name' }),
  'content-type': flags.string({ char: 't', description: '[optional] content type', multiple: true }),
  branch: flags.string({ char: 'B', description: '[optional] branch name' }),
  'secured-assets': flags.boolean({ description: '[optional] use when assets are secured' }),
}

module.exports = ExportCommand
