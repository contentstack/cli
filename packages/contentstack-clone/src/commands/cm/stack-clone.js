const { Command, flags } = require('@contentstack/cli-command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
const {CloneHandler} = require('../../lib/util/clone-handler')
let config = require('../../lib/util/dummyConfig.json')
const path = require('path')
const fs = require('fs');
const rimraf = require('rimraf')

class StackCloneCommand extends Command { 
  async run() {
    let _authToken = credStore.get('authtoken')
    if (_authToken && _authToken !== undefined) {
      config.auth_token = _authToken
      config.host = this.cmaHost
      config.cdn  = this.cdaHost
      const cloneHandler = new CloneHandler(config)
      let result = await cloneHandler.start()
      var pathdir = path.join(__dirname.split("src")[0], 'contents')
      rimraf(pathdir, function(err) {
        console.log("Stack cloning process have been completed successfully");
      })
    } else {
      console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
    }
  }
}

StackCloneCommand.description = `Clone data (structure or content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in a few steps.
`

StackCloneCommand.examples = [
  'csdx cm:stack-clone'
]


module.exports = StackCloneCommand
