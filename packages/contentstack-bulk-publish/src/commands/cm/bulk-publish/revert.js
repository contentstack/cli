const {Command, flags} = require('@oclif/command')
const {start} = require('../../../producer/revert')
const store = require('../../../util/store.js')
const configKey = 'revert'
const { prettyPrint, formatError } = require('../../../util')
const { getStack } = require('../../../util/client.js')
const {cli} = require('cli-ux')

let config

class RevertCommand extends Command {
  async run() {
    const {flags} = this.parse(RevertCommand)
    let updatedFlags
    try {
      updatedFlags = (flags.config) ? store.updateMissing(configKey, flags) : flags
    } catch(error) {
      this.error(error.message, {exit: 2})
    }
    if (this.validate(updatedFlags)) {
      if(await this.confirmFlags(updatedFlags)) {
        try {
          await start(updatedFlags, config)
        } catch(error) {
          let message = formatError(error)
          this.error(message, {exit: 2})
        }
      } else {
        this.exit(0)
      }
    }
  }

  validate({retryFailed, logFile}) {
    let missing = []
    if (retryFailed) {
      return true
    }

    if (!logFile) {
      missing.push('Logfile')
    }

    if (missing.length > 0) {
      this.error(`${missing.join(', ')} is required for processing this command. Please check --help for more details`, {exit: 2})
    } else {
      return true
    }
  }

  async confirmFlags(flags) {
    prettyPrint(flags)
    if(flags.yes) {
      return true
    }
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]')
    return confirmation
  }
}

RevertCommand.description = `Revert publish operations by using a log file
...
The revert command is used for reverting all publish operations performed using bulk-publish script.

Here is a detailed description for all the available flags
-----------------------------------------------------------------------------------------------------------
--retryFailed or -r : This flag is used to retry publishing entries or assets, that failed to publish in a previous
attempt. A log file for the previous session will be required for processing the failed elements. 

NOTE: When retryFailed flag is set, all other flags will be ignored

EXAMPLE : cm:bulk-publish:revert --retryFailed [PATH TO LOG FILE]
EXAMPLE : cm:bulk-publish:revert -r [PATH TO LOG FILE]
-----------------------------------------------------------------------------------------------------------
--logFile or -l : logFile to be used for revert

EXAMPLE : cm:bulk-publish:revert --logFile [PATH TO LOG FILE]
EXAMPLE : cm:bulk-publish:revert -l [PATH TO LOG FILE]
-----------------------------------------------------------------------------------------------------------
`

RevertCommand.flags = {
  retryFailed: flags.string({char: 'r', description: 'retry publishing failed entries from the logfile'}),
  logFile: flags.string({char: 'l', description: 'logfile to be used to revert'}),
}

module.exports = RevertCommand
