let inquirer = require('inquirer')
const Configstore = require('configstore')
const _ = require('lodash')
const fs = require('fs')
let ora = require('ora')
const async = require("async");

let sdkInstance = require('../../lib/util/contentstack-management-sdk')
let exportCmd = require('@contentstack/cli-cm-export')
let importCmd = require('@contentstack/cli-cm-import')
let client = {}
let config
let functionList = []


let stackChoice = {
  type: 'list',
  name: 'stack',
  message: 'Choose Stack ...',
  choices: [],
}

let stackCreationConfirmation = [{
  type: 'confirm',
  name: 'stackCreate',
  message: 'Do you want to create new stack ?',
  initial: true
}]

let stackName = {
  type: 'input',
  name: 'stack',
  message: 'Please Enter New stack name, which you want to create for import!',
  default: "ABC"
}

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

class CloneHandler {
  constructor(opt) {
    config = opt
    client = sdkInstance.Client(config)
  }


  async start(params) {
    return new Promise(async (resolve, reject) => {
      //export section starts from here
      let orgdetails = this.getOrganizationChoices(params)
      orgdetails
      .then(async ()=>{
      var orgSelected = await inquirer.prompt(orgChoice)
      let stackDetails = this.getStack(orgSelected, params)
      stackDetails
      .then(async ()=> {
      let stackSelected = await inquirer.prompt(stackChoice)
      config.source_stack = stackUidList[stackSelected.stack]
      stackName.default = "Copy of " + stackSelected.stack
        let cmdExport = this.cmdExport()
        cmdExport.then(async () => {
          //Import section starts from here
                var stackCreateConfirmation = await inquirer.prompt(stackCreationConfirmation)
                if (stackCreateConfirmation.stackCreate !== true) {
                  let orgdetails = await this.getOrganizationChoices("import")
                  var orgSelected = await inquirer.prompt(orgChoice)
                  let stackDetails = this.getStack(orgSelected, params)
                  let stackSelected = await inquirer.prompt(stackChoice)
                  stackDetails
                  .then(()=> {
                  config.target_stack = stackUidList[stackSelected.stack]
                  this.cloneTypeSelection()
                    .then(()=>{
                      console.log("Stack clone completed successfully ");
                      return resolve()
                    }).catch((error)=>{
                      return reject()
                    })
                  })
                } else {
                  let orgdetails = this.getOrganizationChoices("newstack")
                  orgdetails
                  .then(async ()=>{
                  var orgSelected = await inquirer.prompt(orgChoice)
                  let orgUid = orgUidList[orgSelected.Organization]
                  this.createNewStack(orgUid)
                  .then(()=>{
                    this.cloneTypeSelection()
                    .then(()=>{
                     return resolve()
                    }).catch((error) => {
                     return reject() 
                    })
                  })
                })
                }
                return resolve()
              }).catch((error) => {
                return reject(error)
              })
            })
          })
    })
  }

  getOrganizationChoices = async (params) => {
    return new Promise(async (resolve, reject) => {
      let orgChoice = {
        type: 'list',
        name: 'Organization',
        message: '',
        choices: [],
      }
      try {
        const spinner = ora('Fetching Organization').start()
        let organizations = await client.organization().fetchAll({ limit: 100 })
        spinner.succeed("Fetched Organization")
        for (let i = 0; i < organizations.items.length; i++) {
          orgUidList[organizations.items[i].name] = organizations.items[i].uid
          orgChoice.choices.push(organizations.items[i].name)
        }
        return resolve(orgChoice)
      } catch (e) {
        return reject(e)
      }
    })
  }

  getStack = async (answer, params) => {
    return new Promise(async (resolve, reject) => {
      try {
        let orgUid = orgUidList[answer.Organization]
        const spinner = ora('Fetching stack List').start()
        let stackList = client.stack().query({ organization_uid: orgUid }).find()
        stackList
          .then(async stacklist => {
            for (let j = 0; j < stacklist.items.length; j++) {
              stackUidList[stacklist.items[j].name] = stacklist.items[j].api_key
              stackChoice.choices.push(stacklist.items[j].name)
            }
            spinner.succeed("Fetched stack List")
            return resolve(stacklist)
          }).catch(error => {
            return reject(error)
          })
      } catch (e) {
        return reject()
      }
    })
  }

  async stackSelection(params) {
    return new Promise(async (resolve, reject) => {
      let stackSelected = await inquirer.prompt(stackChoice)
      if (params !== undefined && params === "import") {
        stackChoice.message = "Choose the stack in which data to be import "
        config.target_stack = stackUidList[stackSelected.stack]
        return resolve()
      } else {
        stackChoice.message = "Choose the stack from which data to be export "
        config.source_stack = stackUidList[stackSelected.stack]
        stackName.default = "Copy of " + stackSelected.stack
        let cmdExport = this.cmdExport()
        return resolve()
      }
    })
  }

  async createNewStack(orgUid) {
    return new Promise(async (resolve, reject) => {
      let inputvalue = await inquirer.prompt(stackName)
      let stack = { name: inputvalue.stack }
      const spinner = ora('Creating New stack').start()
      let newStack = client.stack().create({ stack }, { organization_uid: orgUid })
      newStack
        .then(result => {
          spinner.succeed("New Stack created Successfully name as " + result.name)
          config.target_stack = result.api_key
          master_locale = result.master_locale
          return resolve(result)
        }).catch(error => {
          return reject(error)
        })
    })
  }

  async cloneTypeSelection() {
    return new Promise(async (resolve, reject) => {
      var selectedValue = await inquirer.prompt(cloneTypeSelection)
      let cloneType = selectedValue.type
      if (cloneType === "structure") {
        let resultData = this.cmdExe(structureList[0], true)
        resultData.then(() => {
          let files = fs.readdirSync(process.cwd())
          let regex = RegExp("_backup*")
          for (let k = 0; k < files.length; k++) {
            if (regex.test(files[k])) {
              backupPath = files[k]
              break;
            }
          }
          for (let i = 1; i < structureList.length; i++) {
            functionList.push(this.cmdExe(structureList[i], false))
          }

          async.series(functionList,
            function (err, results) {
              if (results) {
                return resolve("Stack clone completed")
              }
              if (err) {
                return reject(err)
              }
            })

        }).catch(error => {
          return reject(error)
        })
      } else {
        let cmdImport = this.cmdImport()
        cmdImport.then(() => {
          return resolve("Stack clone completed")
        }).catch((error) => {
          return reject(error)
        })
      }
    })
  }
  cmdExe(module, createBackupFolder) {
    if (createBackupFolder) {
      return new Promise(function (resolve, reject) {
        const spinner = ora().start()

        // let singleLineArg = ['-A', '-s', config.target_stack, '-d', './content', '-m', module]
        let singleLineArg = ['-A', '-s', config.target_stack, '-d', './content', '-m', module]
        importCmd.run(singleLineArg)
          .then((data) => {
            spinner.succeed()
            return resolve()
          }).catch((error) => {
            return reject(error)
          })
      })
    } else {
      return function (cb) {
        const spinner = ora().start()
        let singleLineArg = ['-A', '-s', config.target_stack, '-d', './content', '-m', module, '-b', backupPath]
        importCmd.run(singleLineArg)
          .then((data) => {
            spinner.succeed()
            cb(null)
          }).catch(error => {
            cb(error)
          })
      }
    }
  }

  async cmdExport() {
    return new Promise((resolve, reject) => {
      let exportData = exportCmd.run(['-A', '-s', config.source_stack, '-d', './content'])
      exportData.then(async () => {
        return resolve()
      }).catch(error => {
        return reject(error)
      })
    })
  }

  async cmdImport() {
    return new Promise((resolve, reject) => {
      const spinner = ora().start()
      let importStructureWithContent = importCmd.run(['-A', '-s', config.target_stack, '-d', './content'])
      importStructureWithContent.then(() => {
        spinner.succeed('Completed import with structure and content')
        return resolve()
      }).catch(error => {
        return reject(error)
      })
    })
   
  }
}

module.exports = {
  CloneHandler, client,
}
