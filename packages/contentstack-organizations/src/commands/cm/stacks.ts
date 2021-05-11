// note that we are using @contentstack/cli-command instead of @oclif/command
import cli from 'cli-ux';
import {table} from 'table';
import * as utilities from '../../../../contentstack-utilities/lib/index'
import ora from 'ora'
const ContentstackManagementSDK = require('@contentstack/management')
const {Command, flags} = require('@contentstack/cli-command')
const arraySort = require('array-sort')
let spinner
let properties

// tableConfig for displaying stack data
let tableConfig = {
  name: {},
  uid: {},
  api_key: {},
  org_uid: {},
  org_name: {},
  created_at: { extended: true }
}

export default class Stack extends Command {
  get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
  }

  static description = 'Executes demo command from ./src/commands/hello.ts'

  name = flags.name || 'world'

  static examples = [
    `$ contentstack-organizations hello
hello world from ./src/hello.ts!
`,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    'org-uid': flags.string({char: 'o'}),
    ...cli.table.flags()
  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Stack)
    let stacks
    try {
      stacks = await this.fetch(flags)
      this.validateProperties(stacks, flags)
    } catch(error) {
      return this.error(error)
    }
    let something = ''
    const name = flags.name || 'world'
    const outputFormat = flags.output || 'json'

    if (stacks.length > 0) {
      if (!flags.output && !flags.csv) {
        let printfn = function(data) { something += data }
        flags.output = outputFormat
        this.createTable(stacks, flags, printfn)
        const somethingObject = JSON.parse(something)
        properties = Object.keys(somethingObject[0]).map(element => this.toTitleCase(element))
        let formattedOutput = somethingObject.map(element => Object.values(element))
        if (!flags['no-header']) 
          formattedOutput.unshift(properties)
        const output = table(formattedOutput)
        this.log(`You have ${stacks.length} stacks`)    
        this.log(output)
      } else {
        let printfn = this.log
        if (flags.csv) flags.output = 'csv'
        this.createTable(stacks, flags, printfn)
      }
    } else {
      this.log(`There are no stacks available for this organization`)
    }
  }

  fetch(flags) {
    return new Promise(async (resolve, reject) => {
      try {
        let selectedOrganization
        if (!flags['org-uid']) {
          selectedOrganization = await utilities.chooseOrganization()
        } else {
          selectedOrganization = await utilities.chooseOrganization(null, null, flags['org-uid'])
        }
        let stacks = await this.getStacks(selectedOrganization)
        resolve(stacks)
      } catch (error) {
        reject(error)
      }
    }) 
  }

  createTable(stacks, flags, print) {
    cli.table(stacks, tableConfig, {
      printLine: print,
      output: flags.output,
      ...flags,
    })
  }

  getStacks(organization) {
    spinner = ora('Loading Stacks').start()
    return new Promise(resolve => {
      let stacks: any = []
      this.managementAPIClient.stack({organization_uid: organization.orgUid}).query({query: {}}).find().then(stackResponse => {
        stackResponse.items.forEach(stack => {
          stacks.push({
            name: stack.name,
            api_key: stack.api_key,
            uid: stack.uid,
            created_at: stack.created_at,
            updated_at: stack.updated_at,
            org_uid: stack.org_uid,
            org_name: organization.orgName
          })
        })
        spinner.stop()
        resolve(stacks)
      })
    })
  }

  sort(data, property) {
    if (property[0] === '-') {
      return arraySort(data, property.split('-').pop(), {reverse: true})
    }
    return arraySort(data, property)
  }

  validateProperties(data, flags) {
    let availableProperties = Object.keys(tableConfig)
    if (flags.sort) {
      if(availableProperties.indexOf(flags.sort) === -1 && availableProperties.indexOf(flags.sort.split('-').pop()) === -1) {
        throw new Error(`Please enter a valid column to sort by.\nThese are the valid columns:\n${availableProperties.join('\n')}`)
      }
    }
    if (flags.columns) {
      let columns = flags.columns.split(',')
      for (let i = 0; i < columns.length; i++) {
        if(availableProperties.indexOf(columns[i]) === -1) {
          throw new Error(`Please enter a valid column to display.\nThese are the valid columns:\n${availableProperties.join('\n')}`)
        }
      }
    }
    return
  }

  // https://stackoverflow.com/questions/27440917/change-any-type-of-string-to-title-case-in-javascript
  toTitleCase(s) { 
    return s
          .replace(/([^A-Z])([A-Z])/g, '$1 $2') // split cameCase
          .replace(/[_\-]+/g, ' ') // split snake_case and lisp-case
          .toLowerCase()
          .replace(/(^\w|\b\w)/g, function(m) { return m.toUpperCase(); }) // title case words
          .replace(/\s+/g, ' ') // collapse repeated whitespace
          .replace(/^\s+|\s+$/, ''); // remove leading/trailing whitespace
  }
}
