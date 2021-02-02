const { Command, flags } = require('@contentstack/cli-command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
// let config = require('../../lib/util/config/default')
const { exec } = require("child_process")
const {CloneHandler} = require('../../lib/util/clone-handler')
let config = {}

class StackCloneCommand extends Command { 
  async run() {
    let _authToken = credStore.get('authtoken')
    if (_authToken && _authToken !== undefined) {
      config.auth_token = _authToken
      let host = this.region
      host.cma = this.cmaHost
      host.cda = this.cdaHost
      config.host = host
      const cloneHandler = new CloneHandler(config)
     let orgSelection = await cloneHandler.organizationSelection("export")
     orgSelection.then(() => {
       console.log("Stack clone successfully");
     }).catch((error) => {
       console.log("Error: ", error);
     })
    } else {
      console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
    }
  }
}

StackCloneCommand.description = `Describe the command here
...
Stack Clone helps users to create a duplicate stack of an existing stack.
This is done using auto stack clone plugin where export and import is done with selected inputs.
`

StackCloneCommand.examples = [
  'csdx cm:stack-clone'
]

StackCloneCommand.flags = {
  
}

module.exports = StackCloneCommand
