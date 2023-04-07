import isEmpty from 'lodash/isEmpty';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export async function selectModule(): Promise<string> {
  const module = await cliux
    .inquire({
      type: 'list',
      name: 'module',
      choices: ['content_types', 'global_fields'],
      message: 'Choose a module',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error(messageHandler.parse('CLI_BRANCH_API_FAILED'));
      process.exit(1);
    });

  return module;
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
  const resp = await cliux.inquire({
    type: 'confirm',
    message: 'Are you sure you want to delete',
    name: 'confirm',
  });
  return resp as boolean;
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

function inquireRequireFieldValidation(input: any): string | boolean {
  if (isEmpty(input)) {
    cliux.error(messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD'));
    process.exit(1);
  }
  return true;
}
