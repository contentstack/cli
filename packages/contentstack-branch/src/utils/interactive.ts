import isEmpty from 'lodash/isEmpty';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export async function selectModule(): Promise<string> {
  return cliux.inquire<string>({
    type: 'list',
    name: 'module',
    message: 'CLI_SELECT_TOKEN_TYPE',
    choices: [
      { name: 'Content Types', value: 'content_types'},
      { name: 'Global Fields', value: 'global_fields'},
      { name: 'Both', value: 'both'},
    ]
  });
}

export async function askCompareBranch(): Promise<string> {
  const resp = await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_COMPARE_BRANCH',
    name: 'compare_branch',
  });
  inquireRequireFieldValidation(resp);
  return resp;
}

export async function askStackAPIKey(): Promise<string> {
  const resp = await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_STACK_API_KEY',
    name: 'api_key',
  });
  inquireRequireFieldValidation(resp);
  return resp;
}

export async function askBaseBranch(): Promise<string> {
  const resp = await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BASE_BRANCH',
    name: 'branch_branch',
  });
  inquireRequireFieldValidation(resp);
  return resp;
}

export async function askSourceBranch(): Promise<string> {
  const resp = await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_SOURCE_BRANCH',
    name: 'source_branch',
  });
  inquireRequireFieldValidation(resp);
  return resp;
}

export async function askBranchUid(): Promise<string> {
  const resp = await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BRANCH_UID',
    name: 'branch_uid',
  });
  inquireRequireFieldValidation(resp);
  return resp;
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
    cliux.error(messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD'));
    process.exit(1);
  }
  return true;
}
