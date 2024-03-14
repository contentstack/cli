const { Command } = require('@contentstack/cli-command');
const { cliux, printFlagDeprecation, flags } = require('@contentstack/cli-utilities');

const store = require('../../../util/store.js');
const { start } = require('../../../producer/revert');
const { prettyPrint, formatError } = require('../../../util');

let config;
const configKey = 'revert';

class RevertCommand extends Command {
  async run() {
    const { flags: revertFlags } = await this.parse(RevertCommand);
    revertFlags.retryFailed = revertFlags['retry-failed'] || revertFlags.retryFailed;
    revertFlags.logFile = revertFlags['log-file'] || revertFlags.logFile;
    delete revertFlags['retry-failed'];
    delete revertFlags['log-file'];

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
          const message = formatError(error);
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
      missing.push('log-file');
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
    return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
  }
}

RevertCommand.description = `Revert publish operations by using a log file
The revert command is used to revert all publish operations performed using bulk-publish script.
A log file name is required to execute revert command
`;

RevertCommand.flags = {
  'retry-failed': flags.string({ description: 'retry publishing failed entries from the logfile' }),
  'log-file': flags.string({ description: 'logfile to be used to revert' }),

  //To be deprecated
  retryFailed: flags.string({
    char: 'r',
    description: 'retry publishing failed entries from the logfile',
    hidden: true,
    parse: printFlagDeprecation(['-r', '--retryFailed'], ['--retry-failed']),
  }),
  logFile: flags.string({
    char: 'l',
    description: 'logfile to be used to revert',
    hidden: true,
    parse: printFlagDeprecation(['-l', '--logFile'], ['--log-file']),
  }),
};

RevertCommand.examples = [
  'Using --log-file',
  'cm:bulk-publish:revert --log-file [LOG FILE NAME]',
  '',
  'Using --retry-failed',
  'cm:bulk-publish:revert --retry-failed [LOG FILE NAME]',
];

RevertCommand.aliases = ['cm:bulk-publish:revert'];

module.exports = RevertCommand;
