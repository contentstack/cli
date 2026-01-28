/**
 * Command interface for the command pattern
 */
export interface ICommand {
  execute(params?: any): Promise<any>;
  undo?(params?: any): Promise<void>;
  params?: any;
}

/**
 * Command parameters for organization selection
 */
export interface OrgCommandParams {
  msg?: string;
  isSource?: boolean;
}

/**
 * Command parameters for stack selection
 */
export interface StackCommandParams {
  org?: { Organization: string };
  msg?: string;
  isSource?: boolean;
}

/**
 * Command parameters for branch selection
 */
export interface BranchCommandParams {
  api_key?: string;
  isSource?: boolean;
  returnBranch?: boolean;
}

/**
 * Command parameters for stack creation
 */
export interface CreateStackCommandParams {
  orgUid: string;
}
