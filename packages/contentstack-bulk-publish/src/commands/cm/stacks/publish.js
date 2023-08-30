'use strict';

const { Command } = require('@contentstack/cli-command');
const { getSelectedCommand } = require('../../../util/command-helper');
const AssetsPublishReceiverCommand = require('../assets/publish');
const EntriesPublishReceiverCommand = require('../entries/publish');

class StackPublishCommand extends Command {
  async run() {
    try {
      this.optionController = new OptionController();
      this.entriesPublishReceiver = new EntriesPublishReceiverCommand(this.argv, this.config);
      this.assetsPublishReceiver = new AssetsPublishReceiverCommand(this.argv, this.config);
      this.entriesAndAssetsPublishReceiver = new PublishEntriesAndAssetsCommand();

      this.publishEntriesCommand = new PublishEntriesCommand(this.entriesPublishReceiver);
      this.publishAssetsCommand = new PublishAssetsCommand(this.assetsPublishReceiver);
      this.publishEntriesAndAssetsCommand = new PublishEntriesAndAssetsCommand(this.entriesPublishReceiver, this.assetsPublishReceiver);

      this.optionController.setCommand(0, this.publishEntriesCommand);
      this.optionController.setCommand(1, this.publishAssetsCommand);
      this.optionController.setCommand(2, this.publishEntriesAndAssetsCommand);

      const selectedCommand = await getSelectedCommand();
      await this.optionController.execute(selectedCommand);
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
  }
}

StackPublishCommand.description = `Publish entries and assets to multiple environments and locales
The publish command is used to publish entries and assets, to the specified environments and locales.

Note: Content types, Environments and Locales are required to execute the publish entries command successfully.
Note: Environments and Locales are required to execute the publish assets command successfully.
But, if retry-failed flag is set, then only a logfile is required`;

StackPublishCommand.examples = [
  'General Usage',
  'csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS]',
  '',
  'Using --config or -c flag',
  'Generate a config file in the current working directory using `csdx cm:stacks:publish-configure -a [ALIAS]`',
  'csdx cm:stacks:publish --config [PATH TO CONFIG FILE]',
  'csdx cm:stacks:publish -c [PATH TO CONFIG FILE]',
  '',
  'Using --retry-failed flag',
  'csdx cm:stacks:publish --retry-failed [LOG FILE NAME]',
  '',
  'Using --branch flag',
  'csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --branch [BRANCH NAME]',
  '',
  'Using --api-version flag',
  'csdx cm:stacks:publish --environments [ENVIRONMENT 1] [ENVIRONMENT 2] --locales [LOCALE] --alias [MANAGEMENT TOKEN ALIAS] --api-version [API VERSION]',
];

StackPublishCommand.flags = []; // Same as entries and assets.

module.exports = StackPublishCommand;

// Invoker
class OptionController {
  constructor() {
    this.runCommands = [];
    const noCommand = new NoCommand();
    for (let i = 0; i < 3; i++) {
      this.runCommands[i] = noCommand;
    }
  }

  setCommand(slot, command) {
    this.runCommands[slot] = command;
  }

  async execute(slot) {
    await this.runCommands[slot].execute();
  }
}

class NoCommand {
  execute() { }
}

class PublishEntriesCommand {
  constructor(publishEntryReceiver) {
    this.publishEntry = publishEntryReceiver;
  }
  async execute() {
    await this.publishEntry.run();
  }
}

class PublishAssetsCommand {
  constructor(publishAssetReceiver) {
    this.publishAsset = publishAssetReceiver;
  }
  async execute() {
    await this.publishAsset.run();
  }
}

class PublishEntriesAndAssetsCommand {
  constructor(publishEntryReceiver, publishAssetReceiver) {
    this.publishEntry = publishEntryReceiver;
    this.publishAsset = publishAssetReceiver;
  }
  async execute() {
    await this.publishAsset.run();
    await this.publishEntry.run();
  }
}
