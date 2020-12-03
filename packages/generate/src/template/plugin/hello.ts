import {Command, flags} from '@contentstack/cli-command'

export default class Hello extends Command {
  static description = 'sample plugin using Contentstack'

  static examples = [
    `$ csdx hello
hello world from ./src/hello.ts!
`,
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run() {
    const {args, flags} = this.parse(Hello)

    let currentRegion = this.region //get the current region selected by the user
    let managementClient = this.managementAPIClient //get the management client of the specified region

    console.log('region', currentRegion)
    console.log('managementClient', managementClient)

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from ./src/commands/hello.ts`)
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`)
    }
  }
}
