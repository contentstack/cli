import isEmpty from 'lodash/isEmpty';
import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import forEach from 'lodash/forEach';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

import { BranchDiffRes } from '../interfaces';

export async function selectModule(): Promise<string> {
  return await cliux.inquire({
    type: 'list',
    name: 'module',
    message: 'CLI_BRANCH_MODULE',
    choices: [
      { name: 'Content Types', value: 'content-types' },
      { name: 'Global Fields', value: 'global-fields' },
      { name: 'All', value: 'all' },
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
        { name: 'Merge, Ask for Preference', value: 'custom_preferences' },
        { name: 'Overwrite with Compare', value: 'overwrite_with_compare' },
      ],
      message: 'What merge strategy would you like to choose? <doc link>',
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
      message: 'What do you want to merge?',
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
        { name: 'Execute Merge', value: 'both' },
        { name: 'Export Merge Summary', value: 'export' },
        { name: 'Execute Merge and Generate Content Migration Scripts', value: 'merge_n_scripts' },
        { name: 'Export Summary and Generate Content Migration Scripts', value: 'summary_n_scripts' },
        { name: 'Go Back', value: 'previous' },
        { name: 'Start Over', value: 'restart' },
      ],
      message: 'What would you like to do?',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error('Exiting the merge process...');
      process.exit(1);
    });

  return strategy;
}

export async function selectContentMergePreference(): Promise<string> {
  const strategy = await cliux
    .inquire({
      type: 'list',
      name: 'module',
      choices: [
        { name: 'Both existing and new', value: 'existing_new' },
        { name: 'New only', value: 'new' },
        { name: 'Existing only', value: 'existing' },
        { name: 'Ask for preference', value: 'ask_preference' },
      ],
      message: 'What content entries do you want to migrate?',
    })
    .then((name) => name as string)
    .catch((err) => {
      cliux.error('Failed to collect the preference');
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

export async function selectCustomPreferences(module, payload) {
  // cliux.print(`\n Select from ${startCase(camelCase(module))}`, { color: 'yellow' });

  // parse rows
  const tableRows = [];
  if (payload.modified?.length || payload.added?.length || payload.deleted?.length) {
    forEach(payload.added, (item: BranchDiffRes) => {
      const row: any = {};
      row.name = `+ ${item.title}`;
      row.status = 'added';
      row.value = item;
      tableRows.push(row);
    });

    forEach(payload.modified, (item: BranchDiffRes) => {
      const row: any = {};
      row.name = `± ${item.title}`;
      row.status = 'modified';
      row.value = item;
      tableRows.push(row);
    });

    forEach(payload.deleted, (item: BranchDiffRes) => {
      const row: any = {};
      row.name = `- ${item.title}`;
      row.status = 'deleted';
      row.value = item;
      tableRows.push(row);
    });
  } else {
    return;
  }

  const selectedStrategies = await cliux.inquire<any>({
    type: 'table',
    message: `Select the ${startCase(camelCase(module))} changes for merge`,
    name: 'mergeContentTypePreferences',
    selectAll: true,
    pageSize: 10,
    columns: [
      {
        name: 'Merge Prefer Base',
        value: 'merge_prefer_base',
      },
      {
        name: 'Merge Prefer Compare',
        value: 'merge_prefer_compare',
      },
      {
        name: 'Overwrite(Use Compare)',
        value: 'overwrite_with_compare',
      },
      {
        name: 'Ignore(Use Base)',
        value: 'ignore',
      },
    ],
    rows: tableRows,
  });

  let updatedArray = [];
  forEach(selectedStrategies, (strategy: string, index: number) => {
    const selectedItem = tableRows[index];
    if (strategy && selectedItem) {
      delete selectedItem.value.status;
      selectedItem.value.merge_strategy = strategy;
      updatedArray.push(selectedItem);
    }
  });

  return updatedArray; // selected items
}

export async function askBranchNameConfirmation(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_BRANCH_NAME_CONFIRMATION',
    name: 'branch_name',
    validate: inquireRequireFieldValidation,
  });
}

export async function selectContentMergeCustomPreferences(payload) {
  // parse rows
  const tableRows = [];
  if (payload.modified?.length || payload.added?.length) {
    forEach(payload.added, (item: BranchDiffRes) => {
      const row: any = {};
      row.name = `+ ${item.title}`;
      row.status = 'added';
      row.value = item;
      tableRows.push(row);
    });

    forEach(payload.modified, (item: BranchDiffRes) => {
      const row: any = {};
      row.name = `± ${item.title}`;
      row.status = 'modified';
      row.value = item;
      tableRows.push(row);
    });
  } else {
    return;
  }

  const selectedStrategies = await cliux.inquire<any>({
    type: 'table',
    message: `Select the Content Entry changes for merge`,
    name: 'mergeContentEntriesPreferences',
    selectAll: true,
    pageSize: 10,
    columns: [
      {
        name: 'Merge New Only',
        value: 'merge_new',
      },
      {
        name: 'Merge Modified Only',
        value: 'merge_existing',
      },
      {
        name: 'Merge Both',
        value: 'merge_existing_new',
      },
      {
        name: 'Ignore',
        value: 'ignore',
      },
    ],
    rows: tableRows,
  });

  let updatedArray = [];
  forEach(selectedStrategies, (strategy: string, index: number) => {
    const selectedItem = tableRows[index];

    if (strategy && selectedItem) {
      selectedItem.value.entry_merge_strategy = strategy;
      updatedArray.push(selectedItem);
    }
  });

  return updatedArray; // selected items
}
