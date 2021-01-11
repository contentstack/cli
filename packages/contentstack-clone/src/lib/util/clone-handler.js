let inquirer = require('inquirer')
let sdkInstance = require('../../lib/util/contentstack-managment-sdk')
const { exec } = require("child_process")
const _ = require('lodash')
let cli = require("cli-ux")
const fs = require('fs')
const async = require("async");
const ora = require("ora")
const Promise = require('bluebird')
let client = {}
let config

let orgChoice = [{
  type: 'list',
  name: 'Organization',
  message: 'Choose Organization ...',
  choices: [],
}]

let stackChoice = [{
  type: 'list',
  name: 'stack',
  message: 'Choose Stack ...',
  choices: [],
}]

let stackCreationConfirmation = [{
  type: 'confirm',
  name: 'stackCreate',
  message: 'Do you want to create new stack ?',
  initial: true
}]

let stackName = [{
  type: 'input',
  name: 'stack',
  message: 'Please Enter New stack name, which you want to create for import!',
  default: "ABC"
}]

let cloneTypeSelection = [{
  type: 'list',
  name: 'type',
  message: 'Choose the type to clone the stack',
  choices: ["structure", "structure and content"]
}]
let orgUidList = {}
let stackUidList = {}
let structureList = ['locales',
  'environments',
  'extensions',
  'webhooks',
  'global-fields',
  'content-types',
  'labels']
let master_locale
let backupPath
let functionList = []

class CloneHandler {
  constructor(opt) {
    config = opt
    client = sdkInstance.Client(config)
  }

  async organizationSelection(params) {
    // const spinner = ora('Fetching Organization').start()
    cli.cli.action.start('Fetching Organization')
    let fetchresult = client.organization().fetchAll({ limit: 100 })
    fetchresult
      .then(responses => {
        // spinner.succeed("Fetched Organization")
        cli.cli.action.stop("Completed fetching organization")
        for (let i = 0; i < responses.items.length; i++) {
          orgUidList[responses.items[i].name] = responses.items[i].uid
          orgChoice[0].choices.push(responses.items[i].name)
        }
        if (params !== undefined && params === "export") {
          orgChoice[0].message = "Choose the Organization from which data to be export"
        } else {
          orgChoice[0].message = "Choose the Organization in which data to be import"
        }
        //call function here
        inquirer
          .prompt(orgChoice)
          .then(answers => {
            let orgUid = orgUidList[answers.Organization]
            if (params !== undefined && params === "newStack") {
              this.createNewStack(orgUid)
            } else {
              // const spinner = ora('Fetching stack List').start()
              cli.cli.action.start('Fetching stack List')
              let stackList = client.stack().query({ organization_uid: orgUid }).find()
              stackList
                .then(stacklist => {
                  for (let j = 0; j < stacklist.items.length; j++) {
                    stackUidList[stacklist.items[j].name] = stacklist.items[j].api_key
                    stackChoice[0].choices.push(stacklist.items[j].name)
                  }
                  // spinner.succeed()
                  cli.cli.action.stop()
                  this.stackSelection(params)
                }).catch(err => {
                })
            }
          })
      }).catch(err => {

      })
  }

  stackSelection(params) {

    if (params !== undefined && params === "import") {
      stackChoice[0].message = "Choose the stack in which data to be import "
    } else {
      stackChoice[0].message = "Choose the stack from which data to be export "
    }

    inquirer
      .prompt(stackChoice)
      .then(stackSelected => {
        if (params !== undefined && params === "import") {
          config.target_stack = stackUidList[stackSelected.stack]
        } else {
          config.source_stack = stackUidList[stackSelected.stack]
          stackName[0].default = stackSelected.stack
        }
        if (params !== undefined && params === "import") {
          this.cloneTypeSelection()
        } else {
          this.cmdExportImport("export")
        }
      })
  }

  createNewStack(orgUid) {
    inquirer
      .prompt(stackName)
      .then(inputvalue => {
        let stack = { name: inputvalue.stack }
        // const spinner = ora('Creating New stack').start()
        cli.cli.action.start("Creating New stack")
        let newStack = client.stack().create({ stack }, { organization_uid: orgUid })
        newStack
          .then(result => {
            cli.cli.action.stop()
            // spinner.succeed("New Stack created Successfully name as " + result.name)
            config.target_stack = result.api_key
            master_locale = result.master_locale
            this.cloneTypeSelection()
          }).catch(error => {
            console.log("Error:", error);
          })
      })
  }

  cloneTypeSelection() {
    inquirer
      .prompt(cloneTypeSelection)
      .then(seletedValue => {
        let cloneType = seletedValue.type
        if (cloneType === "structure") {
          let resultData = this.cmdExe(structureList[0], true)
          resultData.then(data => {
            let files = fs.readdirSync(process.cwd())
            let regex = RegExp("_backup*")
            for (let k = 0; k < files.length; k++) {
              if (regex.test(files[k])) {
                backupPath = files[k]
                break;
              }
            }
            for (let i = 1; i < structureList.length; i++) {
              debugger
              functionList.push(this.cmdExe(structureList[i], false))
              debugger
            }
            async.series(functionList)
          })

        } else {
          this.cmdExportImport("import")
        }
      })
  }

  cmdExe(module, bollean) {
    if (bollean) {
      return new Promise(function (resolve, reject) {
        // const spinner = ora('Importing ' + module + " module").start()
        cli.cli.action.start('Importing ' + module + ' module')
        exec("node bin/run cm:import -A " + " -s " + config.target_stack + " -d " + "content -m " + module, (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return reject()
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            return;
          }
          let indexStr = stdout.indexOf("region")
          let lstIndex = indexStr + 6
          let strToRemove = stdout.substr(0, lstIndex)
          stdout = stdout.replace(strToRemove, '');
          cli.cli.action.stop()
          // spinner.succeed("Completed " + module + " module")
          console.log(`${stdout}`)
          return resolve()
        })
      })
    } else {
      return function (cb) {
        cli.cli.action.start('Importing ' + module + ' module')
        exec("node bin/run cm:import -A " + "-s " + config.target_stack + " -d " + "content -m " + module + " -b " + backupPath, (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`)
            cb(error)
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`)
            cb(null)
          }
          var last_element = structureList[structureList.length - 1];
          let indexStr = stdout.indexOf("region")
          let lstIndex = indexStr + 6
          let strToRemove = stdout.substr(0, lstIndex)
          stdout = stdout.replace(strToRemove, '');
          cli.cli.action.stop()
          console.log(`${stdout}`)
          if (last_element === module) {
            console.log("Please find the stack here: https://app.contentstack.com/#!/stack/" + config.target_stack + "/content-types?view_by=Alphabetical")
          }
          cb(null)
        })
      }
    }
  }

  cmdExportImport(action) {
    if (action !== undefined && action === "import") {
      // const spinner = ora('Importing all modules with structure and content').start()
      cli.cli.action.start('Importing all modules with structure and content')
      exec("node bin/run cm:import -A " + "-s " + config.target_stack + " -d " + "content", (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`)
          return reject()
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`)
          return;
        }
        console.log(`stdout: ${stdout}`)
        cli.cli.action.stop('Completed import with structure and content')
        // spinner.succeed("Completed import with structure and content")
        return;
      })
    } else if (action !== undefined && action === "export") {
      cli.cli.action.start('Exporting all modules')
      exec("node bin/run cm:export -A " + "-s " + config.source_stack + " -d " + "./content", (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`)
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`)
          return;
        }
        console.log(`stdout: ${stdout}`)
        cli.cli.action.stop()
        inquirer
          .prompt(stackCreationConfirmation)
          .then(seletedValue => {
            if (seletedValue.stackCreate !== true) {
              this.organizationSelection("import")
            } else {
              this.organizationSelection("newStack")
            }
          })
      })
    } else {
      console.log("Please provide the valid input")
    }

  }

  // validateLogin() {
  //   return new Promise(function (resolve, reject) {
  //     inquirer
  //       .prompt(validateLoginConnfirmatiom)
  //       .then(reply => {
  //         if (reply.authname === true) {
  //           return resolve()
  //         } else {
  //           exec("node bin/run auth:login", (error, stdout, stderr) => {
  //             if (error) {
  //               console.error(`exec error: ${error}`);
  //               return;
  //             }
  //             console.log(`Number of files ${stdout}`);
  //           })
  //         }
  //       })
  //   })
  // }

}

module.exports = {
  CloneHandler, client,
}
