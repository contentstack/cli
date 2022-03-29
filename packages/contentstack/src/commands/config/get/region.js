const {Command} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class RegionCommand extends Command {
  async run() {
    let currentRegion = this.region
    if (currentRegion) {
      cli.log(chalk.green(`Currently using ${currentRegion.name} region`))
      cli.log(chalk.green(`CDA HOST: ${currentRegion.cda}`))
      cli.log(chalk.green(`CMA HOST: ${currentRegion.cma}`)) 
    } else {
      cli.log(chalk.yellow("Please set a region using `csdx config:set:region <region>`"))
    }
  }
}

RegionCommand.description = `Get current region set for CLI
`

module.exports = RegionCommand
