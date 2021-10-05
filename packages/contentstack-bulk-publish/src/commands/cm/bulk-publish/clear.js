const fs = require('fs')
const {cli} = require('cli-ux')
const {Command} = require('@oclif/command')
const {getLogsDirPath} = require('../../../util/logger.js')

class ClearCommand extends Command {
  async run() {
    const {flags} = this.parse(ClearCommand)
  	let dirPath = getLogsDirPath()
    if (flags.list) {
    	this.listFiles(dirPath)
    } else if (flags.yes) {
    	this.rmDir(dirPath, false)
    } else {
	    const confirmation = await cli.prompt('Proceed to delete all log files (y/n)?')
	    if (confirmation) {
	    	this.rmDir(dirPath, false)
	    }
    }
  }

	rmDir(dirPath, removeSelf) {
		if (fs.existsSync(dirPath)) {
			if (removeSelf === undefined)
		    removeSelf = true;
		  try { var files = fs.readdirSync(dirPath); }
		  catch(e) { return; }
		  if (files.length > 0)
		    for (var i = 0; i < files.length; i++) {
		      var filePath = dirPath + '/' + files[i];
		      if (fs.statSync(filePath).isFile())
		        fs.unlinkSync(filePath);
		      else
		        rmDir(filePath);
		    }
		  if (removeSelf)
		    fs.rmdirSync(dirPath);
		  this.log('Log files have been cleared')
		} else {
			this.error(`The log directory doesn't exist.`)
		}
	}

	listFiles(dirPath) {
		if (fs.existsSync(dirPath)) {
			fs.readdir(dirPath, (err, files) => {
				this.log(files.length)
			})	
		} else {
			this.error(`The log directory doesn't exist.`)
		}
	}
}

ClearCommand.description = `Clear the log folder
`

ClearCommand.flags = {
  list: flags.boolean({char: 'l', description: 'List number of log files'}),
  yes: flags.boolean({char: 'y', description: 'Delete all files without asking for confirmation'})
}

module.exports = ClearCommand
