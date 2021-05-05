/* eslint-disable complexity */
const {Command, flags} = require('@contentstack/cli-command')
const {configWithMToken,
  parameterWithMToken,
  withoutParameterMToken,
  configWithAuthToken,
  parametersWithAuthToken,
  withoutParametersWithAuthToken,
} = require('../../lib/util/export-flags')
const Configstore  = require('configstore')
const credStore = new Configstore('contentstack_cli')

class ExportCommand extends Command {
  async run() {
    const {flags} = this.parse(ExportCommand)
    const extConfig = flags.config
    let sourceStack = flags['stack-uid']
    const alias = flags['management-token-alias']
    const authToken = flags['auth-token']
    const data = flags.data
    const moduleName = flags.module
    let _authToken = credStore.get('authtoken')
    let host = this.region
    let cmaHost = host.cma.split('//')
    let cdaHost = host.cda.split('//')
    host.cma = cmaHost[1]
    host.cda = cdaHost[1]

    if (alias && alias !== undefined) {
      debugger
      let managementTokens = this.getToken(alias)
      if (managementTokens && managementTokens !== undefined) {
        if (extConfig && extConfig !== undefined) {
          configWithMToken(
            extConfig,
            managementTokens,
            host
          )
        } else if (data) {
          parameterWithMToken(
            managementTokens,
            data,
            moduleName,
            host,
            _authToken
          )
        } else if (data === undefined && sourceStack === undefined) {
          withoutParameterMToken(
            managementTokens,
            moduleName,
            host,
            _authToken
          )
        } else {
          this.log('Please provide a valid command. Run "csdx cm:export --help" command to view the command usage')
        }
      } else {
        this.log(alias + ' management token is not present, please add managment token first')
      }
    } else if (authToken && authToken !== undefined && _authToken && _authToken !== undefined) {
      debugger
      if (extConfig && extConfig !== undefined) {
        configWithAuthToken(
          extConfig,
          _authToken,
          moduleName,
          host
        )
      } else if (sourceStack && data) {
        return parametersWithAuthToken(
          _authToken,
          sourceStack,
          data,
          moduleName,
          host
        )
      } else if (data === undefined && sourceStack === undefined) {
        withoutParametersWithAuthToken(
          _authToken,
          moduleName,
          host
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
  'csdx cm:export -a <management_token_alias>',
  'csdx cm:export -a <management_token_alias> -d <path/to/export/destination/dir>',
  'csdx cm:export -a <management_token_alias> -c <path/to/config/file>',
  'csdx cm:export -A -m <single module name>',
]

ExportCommand.flags = {
  config: flags.string({char: 'c', description: '[optional] path of the config'}),
  'stack-uid': flags.string({char: 's', description: 'API key of the source stack'}),
  data: flags.string({char: 'd', description: 'path or location to store the data'}),
  'management-token-alias': flags.string({char: 'a', description: 'alias of the management token'}),
  'auth-token': flags.boolean({char: 'A', description: 'to use auth token'}),
  module: flags.string({char: 'm', description: '[optional] specific module name'}),
}

module.exports = ExportCommand
