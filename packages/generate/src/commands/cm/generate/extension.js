const {Command, flags} = require('@oclif/command')
const path = require('path')
const fs = require('fs-extra')
const {cli} = require('cli-ux')

let srcDir = path.join(__dirname, '../../../template/regular')
const destDir = `${process.cwd()}/extension-template`

class ExtensionCommand extends Command {
  async run() {
    const {flags} = this.parse(ExtensionCommand)
    const name = flags.name || 'world'

    if (flags.gulp) {
    	srcDir = path.join(__dirname, '../../../template/gulp-build')
    }

    fs.ensureDir(destDir)
    .then(() => {
    	fs.readdir(destDir, async (error, files) => {
    		let deleteConfirmation
    		if (files.length > 0)
    			deleteConfirmation = await cli.prompt('The folder \'extension-template\' will be rewritten. Do you wish to continue?')
    		if (deleteConfirmation) {
    			fs.emptyDir(destDir)
    			.then(() => {
    				fs.copy(srcDir, destDir, error => {
			    		if (error) {
			    			this.error(error, {exit: 2})
			    		} else {
						    this.log(`successfully created starter code at ${destDir}`)
			    		}
			    	})
    			})
    			.catch(error => {
    				this.error(error, {exit: 2})
    			})
    		}
    	})
    })
    .catch(error => {
    	this.error(error, {exit: 2})
    })
  }
}

ExtensionCommand.description = `Generate starter code for Extension development
`

ExtensionCommand.flags = {
  name: flags.string({char: 'n', description: 'name to print'}),
  gulp: flags.boolean({char: 'g', description: 'gulp enabled starter kit'}),
  yes: flags.boolean({char: 'y', description: 'Rewrite extension folder without asking for confirmation'})
}

module.exports = ExtensionCommand
