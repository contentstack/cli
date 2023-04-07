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

export async function selectMergeStrategy(): Promise<string> {
  const strategy = await cliux
    .inquire({
      type: 'list',
      name: 'module',
      choices: [
        { name: 'Merge, Prefer Base', value: 'merge_prefer_base' },
        { name: 'Merge, Prefer Compare', value: 'merge_prefer_compare' },
        { name: 'Overwrite with Compare', value: 'overwrite_with_compare' },
        { name: 'Merge, Ask for Preference', value: 'custom_preferences' },
      ],
      message: 'What merge strategy would you like to choose',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error('Failed to collect the merge strategy');
      process.exit(1);
    });

  return strategy;
}

export async function selectMergeStrategySubOptions(): Promise<string> {
  const strategy = await cliux
    .inquire({
      type: 'list',
      name: 'module',
      choices: [
        { name: 'New in Compare Only', value: 'new' },
        { name: 'Modified Only', value: 'modified' },
        { name: 'Both', value: 'both' },
        { name: 'Go Back', value: 'previous' },
        { name: 'Start Over', value: 'restart' },
      ],
      message: 'What do you want to merge',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error('Failed to collect the merge strategy');
      process.exit(1);
    });

  return strategy;
}
