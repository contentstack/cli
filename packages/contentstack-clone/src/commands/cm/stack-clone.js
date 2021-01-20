const { Command, flags } = require('@contentstack/cli-command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
let config = require('../../lib/util/config/default')
const { exec } = require("child_process")
const {CloneHandler} = require('../../lib/util/clone-handler')
const { resolve } = require('bluebird')
const { reject } = require('async')


// const export  = require('contentstack_cli')


class StackCloneCommand extends Command { 
  static flags = {
    app: flags.string({required: true})
  } 
  async run() {
    let exportCmd  = require('@contentstack/cli-cm-export')
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
It is an auto migration script
`

StackCloneCommand.flags = {
  
}

module.exports = StackCloneCommand
