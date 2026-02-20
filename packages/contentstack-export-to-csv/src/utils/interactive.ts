/**
 * Interactive prompt utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import { select, checkbox, confirm } from '@inquirer/prompts';
import { cliux } from '@contentstack/cli-utilities';

import { messages } from '../messages';
import { exitProgram } from './error-handler';
import { getOrganizations, getOrganizationsWhereUserIsAdmin, getStacks, getLanguages } from './api-client';
import type {
  ManagementClient,
  StackClient,
  OrganizationChoice,
  StackChoice,
  BranchChoice,
  LanguageChoice,
  FallbackOptions,
  Branch,
  OrgMap,
  LanguageMap,
} from '../types';

// ============================================================================
// Startup Questions
// ============================================================================

/**
 * Display startup questions to choose an action.
 */
export async function startupQuestions(): Promise<string> {
  const action = await select({
    message: 'Choose Action',
    choices: [
      { value: messages.ACTION_EXPORT_ENTRIES },
      { value: messages.ACTION_EXPORT_USERS },
      { value: messages.ACTION_EXPORT_TEAMS },
      { value: messages.ACTION_EXPORT_TAXONOMIES },
      { value: 'Exit' },
    ],
  });

  if (action === 'Exit') exitProgram();
  return action;
}

// ============================================================================
// Organization Prompts
// ============================================================================

/**
 * Prompt user to choose an organization.
 */
export async function chooseOrganization(
  managementAPIClient: ManagementClient,
  action?: string,
): Promise<OrganizationChoice> {
  let organizations: OrgMap;

  if (action === messages.ACTION_EXPORT_USERS || action === messages.ACTION_EXPORT_TEAMS || action === 'teams') {
    organizations = await getOrganizationsWhereUserIsAdmin(managementAPIClient);
  } else {
    organizations = await getOrganizations(managementAPIClient);
  }

  const choices = [
    ...Object.keys(organizations).map((name) => ({ value: name })),
    { value: messages.ACTION_CANCEL },
  ];

  const chosenOrg = await select({
    message: 'Choose an Organization',
    choices,
    loop: false,
  });

  if (chosenOrg === messages.ACTION_CANCEL) exitProgram();
  return { name: chosenOrg, uid: organizations[chosenOrg] };
}

// ============================================================================
// Stack Prompts
// ============================================================================

/**
 * Prompt user to choose a stack.
 */
export async function chooseStack(
  managementAPIClient: ManagementClient,
  orgUid: string,
  stackApiKey?: string,
): Promise<StackChoice> {
  const stacks = await getStacks(managementAPIClient, orgUid);

  if (stackApiKey) {
    const stackName = Object.keys(stacks).find((key) => stacks[key] === stackApiKey);

    if (stackName) {
      return { name: stackName, apiKey: stackApiKey };
    } else {
      throw new Error('Could not find stack');
    }
  }

  const choices = [
    ...Object.keys(stacks).map((name) => ({ value: name })),
    { value: messages.ACTION_CANCEL },
  ];

  const chosenStack = await select({
    message: 'Choose a Stack',
    choices,
  });

  if (chosenStack === messages.ACTION_CANCEL) exitProgram();
  return { name: chosenStack, apiKey: stacks[chosenStack] };
}

// ============================================================================
// Branch Prompts
// ============================================================================

/**
 * Prompt user to choose a branch.
 */
export async function chooseBranch(branchList: Branch[]): Promise<BranchChoice> {
  try {
    const branch = await select({
      message: 'Choose a Branch',
      choices: branchList.map((b) => ({ value: b.uid })),
    });

    return { branch };
  } catch (err) {
    cliux.error(err as string);
    throw err;
  }
}

// ============================================================================
// Content Type Prompts
// ============================================================================

/**
 * Prompt user to choose content types (basic checkbox).
 */
export async function chooseContentType(stackAPIClient: StackClient, skip: number): Promise<string[]> {
  const { getContentTypes } = await import('./api-client');
  const contentTypes = await getContentTypes(stackAPIClient, skip);
  const contentTypesList = Object.values(contentTypes) as string[];

  const chosenContentTypes = await checkbox({
    message: 'Choose Content Type (Press Space to select the content types)',
    choices: contentTypesList.map((ct) => ({ value: ct, name: ct })),
    loop: false,
  });

  return chosenContentTypes;
}

/**
 * Prompt user to choose content types (searchable multi-select).
 *
 * Note: inquirer-checkbox-plus-prompt is incompatible with inquirer v9+
 * (registerPrompt was removed). Replaced with checkbox() from @inquirer/prompts
 * which has built-in real-time filtering — users type to search, Space to select.
 */
export async function chooseInMemContentTypes(contentTypesList: string[]): Promise<string[]> {
  let chosenContentTypes: string[] = [];

  while (chosenContentTypes.length === 0) {
    chosenContentTypes = await checkbox({
      message: 'Choose Content Type (Type to filter, Space to select)',
      choices: contentTypesList.map((ct) => ({ value: ct, name: ct })),
      loop: false,
    });

    // if any term to filter by doesn't exist, exclude
    if (chosenContentTypes.length === 0) {
      cliux.print('Please select atleast one content type.', { color: 'yellow' });
    }
  }

  return chosenContentTypes;
}

// ============================================================================
// Language Prompts
// ============================================================================

/**
 * Prompt user to choose a language/locale.
 */
export async function chooseLanguage(stackAPIClient: StackClient): Promise<LanguageChoice> {
  const languages: LanguageMap = await getLanguages(stackAPIClient);

  const choices = [
    ...Object.keys(languages).map((name) => ({ value: name })),
    { value: messages.ACTION_CANCEL },
  ];

  const chosenLanguage = await select({
    message: 'Choose Language',
    choices,
  });

  if (chosenLanguage === messages.ACTION_CANCEL) exitProgram();
  return { name: chosenLanguage, code: languages[chosenLanguage] };
}

// ============================================================================
// Fallback Options Prompts
// ============================================================================

/**
 * Prompt user for fallback options.
 */
export async function chooseFallbackOptions(stackAPIClient: StackClient): Promise<FallbackOptions> {
  try {
    const includeFallback = await confirm({
      message: 'Include fallback locale data when exporting taxonomies?',
      default: false,
    });

    let fallbackLocale: string | null = null;

    if (includeFallback) {
      // Get available languages for fallback locale selection
      const languages: LanguageMap = await getLanguages(stackAPIClient);

      const selectedFallbackLocale = await select({
        message: 'Choose fallback locale',
        choices: Object.keys(languages).map((name) => ({ value: name })),
      });

      fallbackLocale = languages[selectedFallbackLocale];
    }

    return { includeFallback, fallbackLocale };
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// Team Export Prompts
// ============================================================================

/**
 * Prompt to continue exporting without certain fields.
 */
export async function promptContinueExport(): Promise<boolean> {
  try {
    const chooseExport = await select({
      message:
        'Access denied: Please confirm if you still want to continue exporting the data without the { Stack Name, Stack Uid, Role Name } fields.',
      choices: [{ value: 'yes' }, { value: 'no' }],
      loop: false,
    });

    return chooseExport === 'yes';
  } catch (error) {
    cliux.print(error as string, { color: 'red' });
    process.exit(1);
  }
}