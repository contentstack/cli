const Help = require('@oclif/plugin-help').default
const figlet = require('figlet')
const {cli} = require('cli-ux')

class MyHelpClass extends Help {
  // eslint-disable-next-line no-useless-constructor
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
