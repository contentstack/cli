const { Command } = require('@contentstack/cli-command');
const Configstore = require('configstore');
const credStore = new Configstore('contentstack_cli');
const { CloneHandler } = require('../../../lib/util/clone-handler');
let config = require('../../../lib/util/dummyConfig.json');
const path = require('path');
const rimraf = require('rimraf');
let pathdir = path.join(__dirname.split('src')[0], 'contents');

class StackCloneCommand extends Command {
  async run() {
    try {
      this.registerCleanupOnInterrupt(pathdir);
      let _authToken = credStore.get('authtoken');
      if (_authToken && _authToken !== undefined) {
        config.auth_token = _authToken;
        config.host = this.cmaHost;
        config.cdn = this.cdaHost;
        const cloneHandler = new CloneHandler(config);
        await cloneHandler.start();
        let successMessage = 'Stack cloning process have been completed successfully';
        await this.cleanUp(pathdir, successMessage);
      } else {
        console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
      }
    } catch (error) {
      await this.cleanUp(pathdir);
      // eslint-disable-next-line no-console
      console.log(error.message || error);
    }
  }

  async cleanUp(pathDir, message) {
    return new Promise((resolve) => {
      rimraf(pathDir, function (err) {
        if (err) throw err;
        if (message) {
          // eslint-disable-next-line no-console
          console.log(message);
        }
        resolve();
      });
    });
  }

  registerCleanupOnInterrupt(pathDir) {
    ['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach((signal) =>
      process.on(signal, async () => {
        // eslint-disable-next-line no-console
        console.log('\nCleaning up');
        await this.cleanUp(pathDir);
        // eslint-disable-next-line no-console
        console.log('done');
        // eslint-disable-next-line no-process-exit
        process.exit();
      }),
    );
  }
}

StackCloneCommand.description = `Clone data (structure or content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in a few steps.
`;

StackCloneCommand.examples = ['csdx cm:stacks:clone'];

StackCloneCommand.aliases = ['cm:stack-clone'];

module.exports = StackCloneCommand;
