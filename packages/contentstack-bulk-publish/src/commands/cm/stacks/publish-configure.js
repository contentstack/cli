const fs = require('fs');
const path = require('path');
const { Command, flags } = require('@contentstack/cli-command');
const { cliux } = require('@contentstack/cli-utilities');

let config = require('../../../config/index.js');

class ConfigureCommand extends Command {
  async run() {
    const configureFlags = this.parse(ConfigureCommand).flags;

    if (!configureFlags.alias) {
      configureFlags.alias = await cliux.prompt('Please enter the management token alias to be used');
    }

    try {
      this.getToken(configureFlags.alias);
    } catch (error) {
      this.error(`The configured management token alias ${configureFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${configureFlags.alias}'`, { exit: 2 })
    }

    this.setConfig(configureFlags);
    this.log('The configuration has been saved successfully.');
  }

  setConfig({ alias }) {
    if (alias) config.alias = alias;
    fs.writeFileSync(path.join(process.cwd(), 'config.js'), `module.exports = ${JSON.stringify(config, null, 2)}`);
  }
}

ConfigureCommand.description = `The configure command is used to generate a configuration file for publish scripts.`;

ConfigureCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias(name) for the management token' }),
};

ConfigureCommand.examples = [
  'csdx cm:stacks:publish-configure',
  'csdx cm:stacks:publish-configure -a <management_token_alias>',
  'csdx cm:stacks:publish-configure --alias <management_token_alias>',
];

ConfigureCommand.aliases = ['cm:bulk-publish:configure'];

module.exports = ConfigureCommand;
