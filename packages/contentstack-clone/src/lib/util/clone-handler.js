let inquirer = require('inquirer')
const Configstore = require('configstore')
const _ = require('lodash')
const fs = require('fs')
let ora = require('ora')
const async = require("async");
const path = require('path')
const { addlogs } = require('../util/log');

let sdkInstance = require('../../lib/util/contentstack-management-sdk')
let exportCmd = require('@contentstack/cli-cm-export')
let importCmd = require('@contentstack/cli-cm-import')
let client = {}
let config

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

let orgUidList = {}
let stackUidList = {}

let structureList = ['locales',
  'environments',
  'extensions',
  'webhooks',
  'global-fields',
  'content-types',
  'workflows',
  'releases',
  'labels']
let master_locale

class CloneHandler {
  constructor(opt) {
    config = opt
    client = sdkInstance.Client(config)
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      // export section starts from here
      let orgdetails = this.getOrganizationChoices()
      orgdetails
      .then(async (orgList)=>{
      var orgSelected = await inquirer.prompt(orgList)
      let stackDetails = this.getStack(orgSelected)
      stackDetails
      .then(async (stackList)=> {
      let stackSelected = await inquirer.prompt(stackList)
      config.source_stack = stackUidList[stackSelected.stack]
      stackName.default = "Copy of " + stackSelected.stack
        let cmdExport = this.cmdExport()
        cmdExport.then(async () => {
          //Import section starts from here
                var stackCreateConfirmation = await inquirer.prompt(stackCreationConfirmation)
                if (stackCreateConfirmation.stackCreate !== true) {
                  let orgdetails = this.getOrganizationChoices()
                  orgdetails
                  .then(async (orgList)=>{
                  var orgSelected = await inquirer.prompt(orgList)
                  let stackDetails = this.getStack(orgSelected)
                  stackDetails
                  .then(async (stackList)=> {
                  let stackSelected = await inquirer.prompt(stackList)
                  config.target_stack = stackUidList[stackSelected.stack]
                  this.cloneTypeSelection()
                    .then((msgData)=>{
                      return resolve(msgData)
                    }).catch((error)=>{
                      return reject(error.errorMessage)
                    })
                  }).catch((error) => {
                    return reject( error.errorMessage)
                  })
                }).catch((error)=>{
                  return reject(error.errorMessage)
                })
              } else {
                  let orgdetails = this.getOrganizationChoices()
                  orgdetails
                  .then(async (orgList)=>{
                  var orgSelected = await inquirer.prompt(orgList)
                  let orgUid = orgUidList[orgSelected.Organization]
                  this.createNewStack(orgUid)
                  .then(()=>{
                    this.cloneTypeSelection()
                    .then((msgData)=>{
                     return resolve(msgData)
                    }).catch((error) => {
                     return reject(error) 
                    })
                  }).catch((error)=>{
                    return reject(error.errorMessage)
                  })
                }).catch((error) => {
                  return reject(error.errorMessage)
                })
                }
              }).catch((error) => {
                return reject(error)
              })
            })
          })
    })
  }

  getOrganizationChoices = async () => {
    let orgChoice = {
      type: 'list',
      name: 'Organization',
      message: '',
      choices: [],
    }
    return new Promise(async (resolve, reject) => {
      const spinner = ora('Fetching Organization').start()
      try {
        let organizations = await client.organization().fetchAll({ limit: 100 })
        spinner.succeed("Fetched Organization")
        for (let i = 0; i < organizations.items.length; i++) {
          orgUidList[organizations.items[i].name] = organizations.items[i].uid
          orgChoice.choices.push(organizations.items[i].name)
        }
        return resolve(orgChoice)
      } catch (e) {
        spinner.fail()
        return reject(e)
      }
    })
  }

  getStack = async (answer) => {
    return new Promise(async (resolve, reject) => {
      let stackChoice = {
        type: 'list',
        name: 'stack',
        message: 'Choose Stack ...',
        choices: [],
      }
      const spinner = ora('Fetching stack List').start()      
      try {
        let orgUid = orgUidList[answer.Organization]
        let stackList = client.stack().query({ organization_uid: orgUid }).find()
        stackList
          .then(async stacklist => {
            for (let j = 0; j < stacklist.items.length; j++) {
              stackUidList[stacklist.items[j].name] = stacklist.items[j].api_key
              stackChoice.choices.push(stacklist.items[j].name)
            }
            spinner.succeed("Fetched stack List")
            return resolve(stackChoice)
          }).catch(error => {
            spinner.fail()
            return reject(error)
          })
      } catch (e) {
        spinner.fail()
        return reject(e)
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
          spinner.fail()
          return reject(error)
        })
    })
  }

  async cloneTypeSelection() {
    return new Promise(async (resolve, reject) => {
      let cloneTypeSelection = [{
        type: 'list',
        name: 'type',
        message: 'Choose the type to clone the stack',
        choices: ["structure", "structure and content"]
      }]
      var selectedValue = await inquirer.prompt(cloneTypeSelection)
      let cloneType = selectedValue.type
      config['data'] = path.join(__dirname.split("src")[0], 'contents')
      if (cloneType === "structure") {
        config['modules'] = structureList
        let cmdImport = this.cmdImport()
        cmdImport.then(() => {
          return resolve("Stack clone Structure completed")
        }).catch((error) => {
          return reject(error)
        })
      } else {
        let cmdImport = this.cmdImport()
        cmdImport.then(() => {
          return resolve("Stack clone completed with structure and content")
        }).catch((error) => {
          return reject(error)
        })
      }
    })
  }

  async cmdExport() {
    return new Promise((resolve, reject) => {
      let exportData = exportCmd.run(['-A', '-s', config.source_stack, '-d', __dirname.split("src")[0]+'contents'])
      exportData.then(async () => {
        return resolve()
      }).catch(error => {
        return reject(error)
      })
    })
  }

  async cmdImport() {
    return new Promise(async (resolve, reject) => {
       await importCmd.run(['-A', '-c', path.join(__dirname, 'dummyConfig.json')])
       return resolve()
    })
  }
}

module.exports = {
  CloneHandler, client,
}
