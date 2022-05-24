const { Command, flags } = require('@oclif/command');
const { ux: cli } = require('@contentstack/cli-utilities');
const fs = require('fs');
const path = require('path');
let config = require('../../../config/index.js');

class ConfigureCommand extends Command {
  async run() {
    const configureFlags = this.parse(ConfigureCommand).flags;

    if (!configureFlags.alias) {
      configureFlags.alias = await cli.prompt('Please enter the management token alias to be used');
    }

    await this.config.runHook('validateManagementTokenAlias', { alias: configureFlags.alias });
    this.setConfig(configureFlags);
    this.log('The configuration has been saved successfully.');
  }

  setConfig({ alias }) {
    if (alias) config.alias = alias;
    fs.writeFileSync(path.join(process.cwd(), 'config.js'), `module.exports = ${JSON.stringify(config, null, 2)}`);
  }
}

ConfigureCommand.description = `The configure command is used for generating a configuration file for publish script.`;

ConfigureCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Management token alias for the stack' }),
};

ConfigureCommand.examples = [
  'csdx cm:stacks:publish-configure',
  'csdx cm:stacks:publish-configure -a <management_token_alias>',
  'csdx cm:stacks:publish-configure --alias <management_token_alias>',
];

ConfigureCommand.aliases = ['cm:bulk-publish:configure'];

module.exports = ConfigureCommand;
