import isEmpty from 'lodash/isEmpty';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export async function selectModule(): Promise<string> {
  return await cliux.inquire({
    type: 'list',
    name: 'module',
    message: 'CLI_BRANCH_MODULE',
    choices: [
      { name: 'Content Types', value: 'content_types'},
      { name: 'Global Fields', value: 'global_fields'},
      { name: 'Both', value: 'both'},
    ],
    validate: inquireRequireFieldValidation
  });
}

export async function askCompareBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_COMPARE_BRANCH',
    name: 'compare_branch',
    validate: inquireRequireFieldValidation
  });
}

export async function askStackAPIKey(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_STACK_API_KEY',
    name: 'api_key',
    validate: inquireRequireFieldValidation
  });
}

export async function askBaseBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BASE_BRANCH',
    name: 'branch_branch',
    validate: inquireRequireFieldValidation
  });
}
export async function askSourceBranch(): Promise<string> {
 return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_SOURCE_BRANCH',
    name: 'source_branch',
    validate: inquireRequireFieldValidation
  });
}
export async function askBranchUid(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BRANCH_UID',
    name: 'branch_uid',
    validate: inquireRequireFieldValidation
  });
}
export async function askConfirmation(): Promise<boolean> {
  const resp = await cliux.inquire<boolean>({
    type: 'confirm',
    message: 'Are you sure you want to delete this branch ?',
    name: 'confirm',
  });
  return resp;
}

export function inquireRequireFieldValidation(input: any): string | boolean {
  if (isEmpty(input)) {
    return messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD');
  }
  return true;
}
