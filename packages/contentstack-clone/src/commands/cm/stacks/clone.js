const { Command, flags } = require('@contentstack/cli-command');
const { configHandler } = require('@contentstack/cli-utilities');
const { CloneHandler } = require('../../../lib/util/clone-handler');
let config = require('../../../lib/util/dummyConfig.json');
const path = require('path');
const rimraf = require('rimraf');
let pathdir = path.join(__dirname.split('src')[0], 'contents');
const { readdirSync } = require('fs');

class StackCloneCommand extends Command {
  async run() {
    try {
      let self = this;
      let _authToken = configHandler.get('authtoken');

      if (_authToken) {
        const listOfTokens = configHandler.get('tokens');
        const cloneCommandFlags = self.parse(StackCloneCommand).flags;
        const {
          type: cloneType,
          'stack-name': stackName,
          'source-branch': sourceStackBranch,
          'target-branch': targetStackBranch,
          'source-management-token-alias': sourceManagementTokenAlias,
          'destination-management-token-alias': destinationManagementTokenAlias,
        } = cloneCommandFlags;

        if (cloneType) {
          config.cloneType = cloneType;
        }
        if (stackName) {
          config.stackName = stackName;
        }
        if (sourceStackBranch) {
          config.sourceStackBranch = sourceStackBranch;
        }
        if (targetStackBranch) {
          config.targetStackBranch = targetStackBranch;
        }
        if (sourceManagementTokenAlias && listOfTokens[sourceManagementTokenAlias]) {
          config.source_alias = sourceManagementTokenAlias;
          config.source_stack = listOfTokens[sourceManagementTokenAlias].apiKey;
        } else if (sourceManagementTokenAlias) {
          console.log('Provided source token alias not found in your config.!');
        }
        if (destinationManagementTokenAlias && listOfTokens[destinationManagementTokenAlias]) {
          config.destination_alias = destinationManagementTokenAlias;
          config.target_stack = listOfTokens[destinationManagementTokenAlias].apiKey;
        } else if (destinationManagementTokenAlias) {
          console.log('Provided destination token alias not found in your config.!');
        }

        await this.removeContentDirIfNotEmptyBeforeClone(pathdir); // NOTE remove if folder not empty before clone
        this.registerCleanupOnInterrupt(pathdir);

        config.auth_token = _authToken;
        config.host = this.cmaHost;
        config.cdn = this.cdaHost;
        const cloneHandler = new CloneHandler(config);
        await cloneHandler.execute(pathdir);
      } else {
        console.log("AuthToken is not present in local drive, Hence use 'csdx auth:login' command for login");
      }
    } catch (error) {
      await this.cleanUp(pathdir);
      // eslint-disable-next-line no-console
      console.log(error.message || error);
    }
  }

  async removeContentDirIfNotEmptyBeforeClone(dir) {
    try {
      const dirNotEmpty = readdirSync(dir).length;

      if (dirNotEmpty) {
        await this.cleanUp(dir);
      }
    } catch (error) {
      const omit = ['ENOENT']; // NOTE add emittable error codes in the array

      if (!omit.includes(error.code)) {
        console.log(error.message);
      }
    }
  }

  cleanUp(pathDir, message) {
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
    const interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM'];
    const exceptions = ['unhandledRejection', 'uncaughtException'];

    const cleanUp = async (exitOrError = null) => {
      // eslint-disable-next-line no-console
      console.log('\nCleaning up');
      await this.cleanUp(pathDir);
      // eslint-disable-next-line no-console
      console.log('done');
      // eslint-disable-next-line no-process-exit

      if (exitOrError instanceof Promise) {
        exitOrError.catch((error) => {
          console.log((error && error.message) || '');
        });
      } else if (exitOrError && exitOrError.message) {
        console.log(exitOrError.message);
      }

      if (exitOrError === true) process.exit();
    };

    exceptions.forEach((event) => process.on(event, cleanUp));
    interrupt.forEach((signal) => process.on(signal, () => cleanUp(true)));
  }
}

StackCloneCommand.description = `Clone data (structure/content or both) of a stack into another stack
Use this plugin to automate the process of cloning a stack in few steps.
`;

StackCloneCommand.examples = [
  'csdx cm:stacks:clone',
  'csdx cm:stacks:clone --source-branch --target-branch',
  'csdx cm:stacks:clone -a <management token alias>',
  'csdx cm:stacks:clone --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
  'csdx cm:stacks:clone --source-branch --target-branch --source-management-token-alias <management token alias> --destination-management-token-alias <management token alias>',
];

StackCloneCommand.aliases = ['cm:stack-clone'];

StackCloneCommand.flags = {
  'source-branch': flags.string({
    required: false,
    multiple: false,
    description: 'Branch of the source stack.',
  }),
  'target-branch': flags.string({
    required: false,
    multiple: false,
    description: 'Branch of the target stack.',
  }),
  'source-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Source API key of the target stack token alias.',
  }),
  'destination-management-token-alias': flags.string({
    required: false,
    multiple: false,
    description: 'Source API key of the target stack token alias.',
  }),
  'stack-name': flags.string({
    char: 'n',
    required: false,
    multiple: false,
    description: 'Name for the new stack to store the cloned content.',
  }),
  type: flags.string({
    required: false,
    multiple: false,
    options: ['a', 'b'],
    description: `Type of data to clone
a) Structure (all modules except entries & assets)
b) Structure with content (all modules including entries & assets)
    `,
  }),
};

module.exports = StackCloneCommand;
