// note that we are using @contentstack/cli-command instead of @oclif/command
import cli from 'cli-ux';
import {table} from 'table';
const ContentstackManagementSDK = require('@contentstack/management')
const {Command, flags} = require('@contentstack/cli-command')

export default class Organization extends Command {
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
    ...cli.table.flags()
  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Organization)
    const organizations: any = await this.fetch(flags.sort)
    let something = ''
    const name = flags.name || 'world'
    const outputFormat = flags.output || 'json'

    if (!flags.output && !flags.csv) {
      let printfn = function(data) { something += data }
      flags.output = outputFormat
      this.createTable(organizations, flags, printfn)
      const somethingObject = JSON.parse(something)
      let formattedOutput = somethingObject.map(element => Object.values(element))
      if (!flags['no-header']) 
        formattedOutput.unshift(Object.keys(somethingObject[0]))
      const output = table(formattedOutput)
      this.log(`You have ${organizations.length} organizations`)    
      this.log(output)
    } else {
      let printfn = this.log
      if (flags.csv) flags.output = 'csv'
      this.createTable(organizations, flags, printfn)
    }

    const currentRegion = this.region.name
    const managementClient = this.managementAPIClient

    if (args.file) {
      this.log(`you input argument: ${args.file}`)
    }
  }

  fetch(sort) {
    return new Promise(resolve => {
      let params: any = {}
      if (sort) {
        if (sort[0] === '-') {
          params.desc = sort.split('-').pop()
        } else {
          params.asc = sort
        }
      }
      debugger
      this.managementAPIClient.organization().fetchAll(params).then(response => {
        debugger  
        let formattedResponse = response.items.map(org => {
          return {
            name: org.name,
            uid: org.uid,
            enabled: org.enabled,
            expires_on: org.expires_on,
            created_at: org.created_at,
            updated_at: org.updated_at,
          }
        })
        resolve(formattedResponse)
      })
    }) 
  }

  createTable(organizations, flags, print) {
    cli.table(organizations, {
      name: {},
      uid: {},
      enabled: {},
      expires_on: {},
      created_at: { extended: true },
      updated_at: { extended: true }
    }, {
      printLine: print,
      output: flags.output,
      ...flags,
    })
  }
}
