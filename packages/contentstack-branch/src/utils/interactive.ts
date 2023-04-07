import isEmpty from 'lodash/isEmpty';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export async function selectModule(): Promise<string> {
  const module = await cliux.inquire({
    type: 'list',
    name: 'module',
    choices: ['content_types', 'global_fields'],
    message: 'Choose a module',
  });

  return module as string;
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

export function inquireRequireFieldValidation(input: any): string | boolean {
  if (isEmpty(input)) {
    cliux.error(messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD'));
    process.exit(1);
  }
  return true;
}
