const {Command, flags} = require('@oclif/command')
let inquirer = require('inquirer')
// const { firstClass } = require('../lib/util/test')
// const contentstacksdk = require('@contentstack/management')
// const contentstacksdk = require('@contentstack/management')


// const Stack = require('../lib/util/contentstack-managment-sdk')
let client

// import * as inquirer from 'inquirer'
var Questions = [{
  type: 'list',
  name: 'template',
  message: 'Choose app template ...',
  choices: [],
}]    

// client = stack.Client(Default)
class HelloCommand extends Command {
  async run() {
    // console.log("client+++++++", contentstacksdk)

   inquirer
  .prompt(Questions)
  .then(answers => {
  })
  .catch(error => {
    if(error.isTtyError) {
      // Prompt couldn't be rendered in the current environment
    } else {
      // Something else when wrong
    }
  });
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
