import { ICommand, OrgCommandParams, StackCommandParams, BranchCommandParams, CreateStackCommandParams } from '../../types/command-types';

/**
 * Base command class implementing the command pattern
 */
export class BaseCommand implements ICommand {
  private executeFn: (params?: any) => Promise<any>;
  private undoFn?: (params?: any) => Promise<void>;
  public params?: any;

  constructor(
    executeFn: (params?: any) => Promise<any>,
    undoFn?: (params?: any) => Promise<void>,
    params?: any
  ) {
    this.executeFn = executeFn;
    this.undoFn = undoFn;
    this.params = params;
  }

  async execute(params?: any): Promise<any> {
    return this.executeFn(params || this.params);
  }

  async undo(params?: any): Promise<void> {
    if (this.undoFn) {
      await this.undoFn(params || this.params);
    }
  }
}

/**
 * Command factory functions
 */
export function HandleOrgCommand(params: OrgCommandParams, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.handleOrgSelection.bind(parentContext),
    undefined,
    params
  );
}

export function HandleStackCommand(params: StackCommandParams, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.handleStackSelection.bind(parentContext),
    parentContext.execute.bind(parentContext),
    params
  );
}

export function HandleBranchCommand(
  params: BranchCommandParams,
  parentContext: any,
  backStepHandler?: (params?: any) => Promise<void>
): ICommand {
  return new BaseCommand(
    parentContext.handleBranchSelection.bind(parentContext),
    backStepHandler,
    params
  );
}

export function HandleDestinationStackCommand(params: StackCommandParams, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.handleStackSelection.bind(parentContext),
    parentContext.executeDestination.bind(parentContext),
    params
  );
}

export function HandleExportCommand(params: any, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.cmdExport.bind(parentContext),
    undefined,
    params
  );
}

export function SetBranchCommand(params: any, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.setBranch.bind(parentContext),
    undefined,
    params
  );
}

export function CreateNewStackCommand(params: CreateStackCommandParams, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.createNewStack.bind(parentContext),
    parentContext.executeDestination.bind(parentContext),
    params
  );
}

export function CloneTypeSelectionCommand(params: any, parentContext: any): ICommand {
  return new BaseCommand(
    parentContext.cloneTypeSelection.bind(parentContext),
    undefined,
    params
  );
}

/**
 * Clone command executor class
 */
export class Clone {
  private commands: ICommand[] = [];

  async execute(command: ICommand): Promise<any> {
    this.commands.push(command);
    const result = await command.execute(command.params);
    return result;
  }

  async undo(): Promise<void> {
    if (this.commands.length) {
      const command = this.commands.pop();
      if (command && command.undo) {
        await command.undo(command.params);
      }
    }
  }
}
