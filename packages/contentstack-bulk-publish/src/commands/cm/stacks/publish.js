'use strict';

const { Command, flags } = require('@contentstack/cli-command');
const { getSelectedCommand } = require('../../../util/command-helper');
const AssetsPublishReceiverCommand = require('../assets/publish');
const EntriesPublishReceiverCommand = require('../entries/publish');

class StackPublishCommand extends Command {
  async run() {
    try {
      this.optionController = new OptionController();

      this.entriesPublishReceiver = new EntriesPublishReceiverCommand(this);
      this.assetsPublishReceiver = new AssetsPublishReceiverCommand(this);
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

StackPublishCommand.description = ``;

StackPublishCommand.examples = ``;

StackPublishCommand.flags = [];

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
