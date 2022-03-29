const {cli} = require('cli-ux')
const chalk = require('chalk')
const {Command} = require('@contentstack/cli-command')
const command = new Command()

module.exports = async function (opts) {
  if (opts.Command.id !== 'config:get:region' && opts.Command.id !== 'config:set:region') {
    const region = command.region
    if (!region) {
      cli.log(chalk.yellow("Please set a region using `csdx config:set:region <region>`"))
      command.exit(2)
    } else {
      cli.log(chalk.grey(`Currently using ${region.name} region`))
    }
  }
}
