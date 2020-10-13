const {cli} = require('cli-ux')
const chalk = require('chalk')
const {Command} = require('@contentstack/cli-command')
const command = new Command()

module.exports = async function (opts) {
  if (opts.Command.id !== 'config:get:region') {
    const region = command.region
    cli.log(chalk.grey(`Currently using ${region.name} region`))
  }
}
