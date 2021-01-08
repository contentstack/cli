const { Command, flags } = require('@oclif/command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
let config = require('../../lib/util/config/default')
const { exec } = require("child_process")
const {CloneHandler} = require('../../lib/util/clone-handler') 


class StackCloneCommand extends Command {  
  async run() {
    let _authToken = credStore.get('authtoken')
    if (_authToken && _authToken !== undefined) {
      config.auth_token = _authToken
      let host = this.config.userConfig.getRegion()
      if (host.cma.includes("https://") || host.cma.includes("http://") && host.cda.includes("https://") || host.cda.includes("http://")) {
        let cmaHost = host.cma.split('//')
        let cdaHost = host.cda.split('//')
        host.cma = cmaHost[1]
        host.cda = cdaHost[1]
      }
      config.host = host
      const cloneHandler = new CloneHandler(config)
      cloneHandler.organizationSelection("export")  
    } else {
      console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
    }
  }
}

StackCloneCommand.description = `Describe the command here
...
Extra documentation goes here
`

StackCloneCommand.flags = {
  name: flags.string({ char: 'n', description: 'name to print' }),
}

module.exports = StackCloneCommand
