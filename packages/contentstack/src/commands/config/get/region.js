const {Command} = require('@contentstack/cli-command')
const {cli} = require('cli-ux')
const chalk = require('chalk')

class RegionCommand extends Command {
  async run() {
    let currentRegion = this.region
    cli.log(chalk.green(`Currently using ${currentRegion.name} region`))
    cli.log(chalk.green(`CDA HOST: ${currentRegion.cda}`))
    cli.log(chalk.green(`CMA HOST: ${currentRegion.cma}`))
  }
}

RegionCommand.description = `Get current region set for CLI
`

module.exports = RegionCommand
