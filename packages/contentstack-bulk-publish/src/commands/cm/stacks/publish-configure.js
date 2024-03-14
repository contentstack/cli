const fs = require('fs');
const path = require('path');
const { Command } = require('@contentstack/cli-command');
const { cliux, flags } = require('@contentstack/cli-utilities');

let config = require('../../../config/index.js');

class ConfigureCommand extends Command {
  async run() {
    const { flags: configureFlags } = await this.parse(ConfigureCommand);

    if (configureFlags.alias) {
      try {
        this.getToken(configureFlags.alias);
      } catch (error) {
        this.error(`The configured management token alias ${configureFlags.alias} has not been added yet. Add it using 'csdx auth:tokens:add -a ${configureFlags.alias}'`, { exit: 2 })
      }
    } else if (configureFlags['stack-api-key']) {
      configureFlags.stackApiKey = configureFlags['stack-api-key'];
    } else {
      this.error('Please use `--alias` or `--stack-api-key` to proceed.', { exit: 2 });
    }

    this.setConfig(configureFlags);
    this.log('The configuration has been saved successfully.');
  }

  setConfig({ alias, stackApiKey }) {
    if (alias) config.alias = alias;
    else if (stackApiKey) config.stackApiKey = stackApiKey;
    fs.writeFileSync(path.join(process.cwd(), 'config.js'), `module.exports = ${JSON.stringify(config, null, 2)}`);
  }
}

ConfigureCommand.description = `The configure command is used to generate a configuration file for publish scripts.`;

ConfigureCommand.flags = {
  alias: flags.string({ char: 'a', description: 'Alias(name) for the management token' }),
  'stack-api-key': flags.string({ char: 'k', description: 'Stack api key to be used' }),
};

ConfigureCommand.examples = [
  'csdx cm:stacks:publish-configure',
  'csdx cm:stacks:publish-configure -a <management_token_alias>',
  'csdx cm:stacks:publish-configure --alias <management_token_alias>',
  'csdx cm:stacks:publish-configure --stack-api-key <stack_api_key>',
];

ConfigureCommand.aliases = ['cm:bulk-publish:configure'];

module.exports = ConfigureCommand;
