const Help = require('@oclif/plugin-help').default
const figlet = require('figlet')
const {cli} = require('cli-ux')

class MyHelpClass extends Help {
  constructor(config, opts) {
    super(config, opts)
  }

  showRootHelp() {
    // Shows Contentstack graphics
    cli.log(figlet.textSync('Contentstack', {
      horizontalLayout: 'default',
      verticalLayout: 'default',
    }))
    super.showRootHelp()
  }
}

module.exports = MyHelpClass
