const { Command, flags } = require('@contentstack/cli-command')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
const {CloneHandler} = require('../../lib/util/clone-handler')
let config = require('../../lib/util/dummyConfig.json')
const path = require('path')
const fs = require('fs');

class StackCloneCommand extends Command { 
  async run() {
    let _authToken = credStore.get('authtoken')
    if (_authToken && _authToken !== undefined) {
      config.auth_token = _authToken
      config.host = this.cmaHost
      config.cdn  = this.cdaHost
      const cloneHandler = new CloneHandler(config)
      let result = await cloneHandler.start()
      fs.rmdirSync(path.join(__dirname.split("src")[0], 'contents'), { recursive: true });
      console.log(result);
    } else {
      console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
    }
  }
}

StackCloneCommand.description = `This plugin allows you to perform content or only structure migration tasks
...
By using this plugin, you can automate the content export and import operations for your stacks in your organization.
`

StackCloneCommand.examples = [
  'csdx cm:stack-clone'
]


module.exports = StackCloneCommand
