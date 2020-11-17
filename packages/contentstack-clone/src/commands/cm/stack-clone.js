const {Command, flags} = require('@oclif/command')
let inquirer = require('inquirer')
let exportStack = require('../../lib/util/contentstack-managment-sdk')
const Configstore  = require('configstore')
const credStore = new Configstore('contentstack_cli')
let config = require('../../lib/util/config/default')


var Questions = [{
  type: 'list',
  name: 'template',
  message: 'Choose app template ...',
  choices: [],
}]    

class HelloCommand extends Command {
  // static flags = {
  //   stage: flags.string({options: ['development', 'staging', 'production']})
  // }
  async run() {
     let _authToken = credStore.get('authtoken')
     config.auth_token = _authToken
    config.host = this.config.userConfig.getRegion()
    // client = exportStack.Client(config)
    console.log("config++++++++++", config)
    console.log("sdk", exportStack.Client(config).organization().fetchAll()
                       .then(function() {
                         console.log("jjjjjjjjjjjjj")
                       }))
    // const {flags} = this.parse(MyCommand)

    // let stage = flags.stage
    //if (!stage) {
      // let responses: any = await inquirer.prompt([{
      //   name: 'stage',
      //   message: 'select a stage',
      //   type: 'list',
      //   choices: [{name: 'development'}, {name: 'staging'}, {name: 'production'}],
      // }])
      stage = responses.stage
    //}
    // flags
    // this.log(`the stage is: ${stage}`)
  }
}

HelloCommand.description = `Describe the command here
...
Extra documentation goes here
`

HelloCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = HelloCommand
