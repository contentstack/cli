const fs = require('fs');
const { Command } = require('@contentstack/cli-command');
const { cliux, printFlagDeprecation, flags } = require('@contentstack/cli-utilities');

const { getLogsDirPath } = require('../../../util/logger.js');

class ClearCommand extends Command {
  async run() {
    const { flags: clearFlags } = await this.parse(ClearCommand);
    let dirPath = getLogsDirPath();
    if (clearFlags['log-files-count'] || clearFlags.list) {
      this.listFiles(dirPath);
    } else if (clearFlags.yes) {
      this.rmDir(dirPath, false);
    } else {
      const confirmation = await cliux.confirm('Proceed to delete all log files (y/n)?');
      if (confirmation) {
        this.rmDir(dirPath, false);
      } else {
        this.log('No action performed');
      }
    }
  }

  rmDir(dirPath, removeSelf = true) {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        if (files.length > 0)
          for (const element of files) {
            const filePath = dirPath + '/' + element;
            if (fs.statSync(filePath).isFile()) fs.unlinkSync(filePath);
            else rmDir(filePath);
          }
        if (removeSelf) {
          fs.rmdirSync(dirPath);
        }
        this.log('Log files have been cleared');
      } else {
        this.error(`The log directory doesn't exist.`);
      }
    } catch (e) {
      return;
    }
  }

  listFiles(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.readdir(dirPath, (_err, files) => {
        this.log('Total number of log files - ', files.length);
      });
    } else {
      this.error(`The log directory doesn't exist.`);
    }
  }
}

ClearCommand.description = `Clear the log folder`;

ClearCommand.flags = {
  'log-files-count': flags.boolean({ description: 'List number of log files' }),
  yes: flags.boolean({ char: 'y', description: 'Delete all files without asking for confirmation' }),

  //To be depreacted
  list: flags.boolean({
    description: 'List number of log files',
    char: 'l',
    hidden: true,
    parse: printFlagDeprecation(['-l', '--list'], ['--log-files-count']),
  }),
};

ClearCommand.examples = [
  'csdx cm:stacks:publish-clear-logs',
  'csdx cm:stacks:publish-clear-logs --log-files-count',
  'csdx cm:stacks:publish-clear-logs --yes',
  'csdx cm:stacks:publish-clear-logs -y',
];

ClearCommand.aliases = ['cm:bulk-publish:clear'];

module.exports = ClearCommand;
