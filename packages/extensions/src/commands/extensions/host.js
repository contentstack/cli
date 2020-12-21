const {Command, flags} = require('@oclif/command')
const {exec} = require('child_process')
const {series} = require('async')
const path = require('path')
const ngrok = require('ngrok')

class HostCommand extends Command {
  async run() {
    const {flags} = this.parse(HostCommand)
    const name = flags.name || 'world'

    const liteServer = path.join(__dirname, '../../../node_modules/lite-server/bin/lite-server')
    const gulp = path.join(__dirname, '../../../node_modules/gulp/bin/gulp.js')

    this.log(`hello ${name} from /home/abhinav/Documents/contentstack/cli/packages/extensions/src/commands/host.js`)
    this.log(`executing lite-server from ${process.cwd()}`)
    // process.chdir(path.resolve('../../../'))
    // let a = process.cwd()
    // debugger
    // exec('npm run version', (error, stdout, stderr) => {

    series([
    	(callback) => exec(`${gulp} build`, (error, stdout, stderr) => {
    		debugger
    		callback(null, 'one')
    	}),
    	(callback) => exec(liteServer,  (error, stdout, stderr) => {
    		debugger
    		callback(null, 'two')
    	}),
    	(callback) => exec('ngrok http 3000', (error, stdout, stderr) => {
    		callback(null, 'three')
    	})
    ])

    // exec(liteServer, (error, stdout, stderr) => {
    // 	debugger
    // 	if (error) {
	   //  	debugger
    // 	}
    // 	debugger
    // 	console.log(stdout)
    // })
  }
}

HostCommand.description = `Describe the command here
...
Extra documentation goes here
`

HostCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = HostCommand
