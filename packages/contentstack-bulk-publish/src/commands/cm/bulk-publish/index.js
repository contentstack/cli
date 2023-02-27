const { Command } = require('@contentstack/cli-command');

class HelloCommand extends Command {
  async run() {
    this.log('Please run `csdx cm:bulk-publish --help` to view help section');
  }
}

HelloCommand.description = `Bulk Publish script for managing entries and assets
`;

HelloCommand.flags = {};

module.exports = HelloCommand;
