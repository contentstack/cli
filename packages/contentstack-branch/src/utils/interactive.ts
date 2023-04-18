import isEmpty from 'lodash/isEmpty';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export async function selectModule(): Promise<string> {
  return await cliux.inquire({
    type: 'list',
    name: 'module',
    message: 'CLI_BRANCH_MODULE',
    choices: [
      { name: 'Content Types', value: 'content_types' },
      { name: 'Global Fields', value: 'global_fields' },
      { name: 'Both', value: 'both' },
    ],
    validate: inquireRequireFieldValidation,
  });
}

export async function askCompareBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_COMPARE_BRANCH',
    name: 'compare_branch',
    validate: inquireRequireFieldValidation,
  });
}

export async function askStackAPIKey(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_STACK_API_KEY',
    name: 'api_key',
    validate: inquireRequireFieldValidation,
  });
}

export async function askBaseBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BASE_BRANCH',
    name: 'branch_branch',
    validate: inquireRequireFieldValidation,
  });
}
export async function askSourceBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_SOURCE_BRANCH',
    name: 'source_branch',
    validate: inquireRequireFieldValidation,
  });
}
export async function askBranchUid(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_BRANCH_UID',
    name: 'branch_uid',
    validate: inquireRequireFieldValidation,
  });
}
export async function askConfirmation(): Promise<boolean> {
  const resp = await cliux.inquire<boolean>({
    type: 'confirm',
    message: 'Are you sure you want to delete this branch?',
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
      message: 'What merge strategy would you like to choose?',
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

export async function selectMergeExecution(): Promise<string> {
  const strategy = await cliux
    .inquire({
      type: 'list',
      name: 'module',
      choices: [
        { name: 'Export merge summary', value: 'export' },
        { name: 'Execute only', value: 'execute' },
        { name: 'Export summary & Execute immediately', value: 'both' },
        { name: 'Go Back', value: 'previous' },
        { name: 'Start Over', value: 'restart' },
      ],
      message: 'What do you want to merge?',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error('Exiting the merge process');
      process.exit(1);
    });

  return strategy;
}

export async function askExportMergeSummaryPath(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the file path to export the summary',
    name: 'filePath',
    validate: inquireRequireFieldValidation,
  });
}

export async function askMergeComment(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'Enter a comment for merge',
    name: 'comment',
    validate: inquireRequireFieldValidation,
  });
}

export async function askConfirmationForMigrationScripts(): Promise<string> {
  return await cliux.inquire({
    type: 'list',
    name: 'module',
    message: 'Do you want to create entry migration scripts files based on the migrations?',
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
    validate: inquireRequireFieldValidation,
  });
}
