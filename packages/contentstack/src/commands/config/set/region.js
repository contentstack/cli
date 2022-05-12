const {Command, flags} = require('@oclif/command')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class RegionCommand extends Command {
  async run() {
    const {args, flags} = this.parse(RegionCommand)
    const {cda, cma, name}  = flags
    // Custom flag will get first priority over region argument
    if (cda &&  cma &&  name) {
      try {
        let customRegion = {cda, cma, name}
        customRegion = this.config.userConfig.setCustomRegion(customRegion)
        cli.log(chalk.green(`Custom region has been set to ${customRegion.name}`))
        cli.log(chalk.green(`CDA HOST: ${customRegion.cda}`))
        cli.log(chalk.green(`CMA HOST: ${customRegion.cma}`))
      } catch (error) {
        if (error.name && error.name === 'TypeError') {
          cli.log(chalk.red(error.message))
        } else {
          cli.log(chalk.red(`Failed to set region due to: ${error.message}`))
        }
      }
    } else if (args.region) {
      const selectedRegion = args.region
      let regionDetails = this.config.userConfig.setRegion(selectedRegion)
      cli.log(chalk.green(`Region has been set to ${selectedRegion}`))
      cli.log(chalk.green(`CDA HOST: ${regionDetails.cda}`))
      cli.log(chalk.green(`CMA HOST: ${regionDetails.cma}`))
    } else {
      this.config.userConfig.setRegion('NA')
      cli.log('No argument or custom flag provided. Setting region to default NA')
    }
  }
}

RegionCommand.description = `Set region for CLI
`

RegionCommand.args = [{
  name: 'region',
  description: 'North America(NA), Europe (EU), AZURE-NA',
  options: ['EU', 'NA', 'AZURE-NA'],
}]

RegionCommand.examples =  [
  '$ csdx config:set:region EU',
  '$ csdx config:set:region --cma <contentstack_cma_endpoint> --cda <contentstack_cda_endpoint> --name "India"',
  '$ csdx config:set:region --cma="https://in-api.contentstack.com" --cda="https://in-cda.contentstack.com" --name="India"',
]

RegionCommand.flags = {
  cda: flags.string({
    char: 'd',
    description: 'Custom host to set for content delivery API, if this flag is added then cma and name flags are required',
    dependsOn: ['cma', 'name'],
  }),
  cma: flags.string({
    char: 'm',
    description: 'Custom host to set for content management API, , if this flag is added then cda and name flags are required',
    dependsOn: ['cda', 'name'],
  }),
  name: flags.string({
    char: 'n',
    description: 'Name for the region, if this flag is added then cda and cma flags are required',
    dependsOn: ['cda', 'cma'],
  }),
}

module.exports = RegionCommand
