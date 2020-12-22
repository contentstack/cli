const { Command, flags } = require('@oclif/command')
let inquirer = require('inquirer')
let sdkInstance = require('../../lib/util/contentstack-managment-sdk')
const Configstore = require('configstore')
const credStore = new Configstore('contentstack_cli')
let config = require('../../lib/util/config/default')
const { exec } = require("child_process")
const {CloneHandler} = require('../../lib/util/clone-handler') 


class StackCloneCommand extends Command {  
  async run() {
    let _authToken = credStore.get('authtoken')
    config.auth_token = _authToken
    let host = this.config.userConfig.getRegion()
    if (host.cma.includes("https://") || host.cma.includes("http://") && host.cda.includes("https://") || host.cda.includes("http://")) {
      let cmaMaiURL = host.cma.split('//')
      let cdaMaiURL = host.cda.split('//')
      host.cma = cmaMaiURL[1]
      host.cda = cdaMaiURL[1]
    }
    config.host = host
    const cloneHandler = new CloneHandler(config)
    // cloneHandler.cloneTypeSelection()
    cloneHandler.createNewStack("blt2b4991176c6c1d25")

    // cloneHandler.organizationSelection("export")  
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
