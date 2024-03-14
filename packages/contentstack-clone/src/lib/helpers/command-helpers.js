const CloneCommand = function (execute, undo, params, parentContext) {
  this.execute = execute.bind(parentContext);
  this.undo = undo && undo.bind(parentContext);
  this.params = params;
};

const HandleOrgCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.handleOrgSelection, null, params, parentContext);
};

const HandleStackCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.handleStackSelection, parentContext.execute, params, parentContext);
};

const HandleBranchCommand = function (params, parentContext, backStepHandler) {
  return new CloneCommand(parentContext.handleBranchSelection, backStepHandler, params, parentContext);
};

const HandleDestinationStackCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.handleStackSelection, parentContext.executeDestination, params, parentContext);
};

const HandleExportCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.cmdExport, null, params, parentContext);
};

const SetBranchCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.setBranch, null, params, parentContext);
};

const CreateNewStackCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.createNewStack, parentContext.executeDestination, params, parentContext);
};

const CloneTypeSelectionCommand = function (params, parentContext) {
  return new CloneCommand(parentContext.cloneTypeSelection, null, params, parentContext);
};

const Clone = function () {
  const commands = [];

  return {
    execute: async function (command) {
      commands.push(command);
      const result = await command.execute(command.params);
      return result;
    },
    undo: async function () {
      if (commands.length) {
        const command = commands.pop();
        command.undo && await command.undo(command.params);
      }
    },
  };
};

module.exports = {
  HandleOrgCommand,
  HandleStackCommand,
  HandleBranchCommand,
  HandleDestinationStackCommand,
  HandleExportCommand,
  SetBranchCommand,
  CreateNewStackCommand,
  CloneTypeSelectionCommand,
  Clone,
};
