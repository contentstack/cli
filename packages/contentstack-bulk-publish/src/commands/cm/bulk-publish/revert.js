const { Command, flags } = require('@oclif/command');
const { start } = require('../../../producer/revert');
const store = require('../../../util/store.js');
const configKey = 'revert';
const { prettyPrint, formatError } = require('../../../util');
const { getStack } = require('../../../util/client.js');
const { cli } = require('cli-ux');

let config;

class RevertCommand extends Command {
  async run() {
    const revertFlags = this.parse(RevertCommand).flags;
    let updatedFlags;
    try {
      updatedFlags = revertFlags.config ? store.updateMissing(configKey, revertFlags) : revertFlags;
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
    if (this.validate(updatedFlags)) {
      if (await this.confirmFlags(updatedFlags)) {
        try {
          await start(updatedFlags, config);
        } catch (error) {
          let message = formatError(error);
          this.error(message, { exit: 2 });
        }
      } else {
        this.exit(0);
      }
    }
  }

  validate({ retryFailed, logFile }) {
    let missing = [];
    if (retryFailed) {
      return true;
    }

    if (!logFile) {
      missing.push('Logfile');
    }

    if (missing.length > 0) {
      this.error(
        `${missing.join(', ')} is required for processing this command. Please check --help for more details`,
        { exit: 2 },
      );
    } else {
      return true;
    }
  }

  async confirmFlags(data) {
    prettyPrint(data);
    if (data.yes) {
      return true;
    }
    const confirmation = await cli.confirm('Do you want to continue with this configuration ? [yes or no]');
    return confirmation;
  }
}

RevertCommand.description = `Revert publish operations by using a log file
The revert command is used for reverting all publish operations performed using bulk-publish script.
A log file name is required to execute revert command
`;

RevertCommand.flags = {
  retryFailed: flags.string({ char: 'r', description: 'retry publishing failed entries from the logfile' }),
  logFile: flags.string({ char: 'l', description: 'logfile to be used to revert' }),
};

RevertCommand.examples = [
  'Using --logFile',
  'cm:bulk-publish:revert --logFile [LOG FILE NAME]',
  'cm:bulk-publish:revert -l [LOG FILE NAME]',
  '',
  'Using --retryFailed',
  'cm:bulk-publish:revert --retryFailed [LOG FILE NAME]',
  'cm:bulk-publish:revert -r [LOG FILE NAME]',
];

module.exports = RevertCommand;
