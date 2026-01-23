/**
 * Interactive prompt utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import inquirer, { Answers } from 'inquirer';
// @ts-ignore - no types available
import checkboxPlus from 'inquirer-checkbox-plus-prompt';
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

// Register checkbox-plus prompt type
inquirer.registerPrompt('checkbox-plus', checkboxPlus);

// ============================================================================
// Startup Questions
// ============================================================================

/**
 * Display startup questions to choose an action.
 */
export function startupQuestions(): Promise<string> {
  return new Promise((resolve, reject) => {
    const actions = [
      {
        type: 'list',
        name: 'action',
        message: 'Choose Action',
        choices: [messages.ACTION_EXPORT_ENTRIES, messages.ACTION_EXPORT_USERS, messages.ACTION_EXPORT_TEAMS, messages.ACTION_EXPORT_TAXONOMIES, 'Exit'],
      },
    ];

    inquirer
      .prompt(actions)
      .then((answers: Answers) => {
        if (answers.action === 'Exit') exitProgram();
        resolve(answers.action as string);
      })
      .catch(reject);
  });
}

// ============================================================================
// Organization Prompts
// ============================================================================

/**
 * Prompt user to choose an organization.
 */
export function chooseOrganization(
  managementAPIClient: ManagementClient,
  action?: string,
): Promise<OrganizationChoice> {
  return new Promise(async (resolve, reject) => {
    try {
      let organizations: OrgMap;

      if (action === messages.ACTION_EXPORT_USERS || action === messages.ACTION_EXPORT_TEAMS || action === 'teams') {
        organizations = await getOrganizationsWhereUserIsAdmin(managementAPIClient);
      } else {
        organizations = await getOrganizations(managementAPIClient);
      }

      const orgList = Object.keys(organizations);
      orgList.push(messages.ACTION_CANCEL);

      const _chooseOrganization = [
        {
          type: 'list',
          name: 'chosenOrg',
          message: 'Choose an Organization',
          choices: orgList,
          loop: false,
        },
      ];

      inquirer
        .prompt(_chooseOrganization)
        .then((answers: Answers) => {
          const chosenOrg = answers.chosenOrg as string;
          if (chosenOrg === messages.ACTION_CANCEL) exitProgram();
          resolve({ name: chosenOrg, uid: organizations[chosenOrg] });
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Stack Prompts
// ============================================================================

/**
 * Prompt user to choose a stack.
 */
export function chooseStack(
  managementAPIClient: ManagementClient,
  orgUid: string,
  stackApiKey?: string,
): Promise<StackChoice> {
  return new Promise(async (resolve, reject) => {
    try {
      const stacks = await getStacks(managementAPIClient, orgUid);

      if (stackApiKey) {
        const stackName = Object.keys(stacks).find((key) => stacks[key] === stackApiKey);

        if (stackName) {
          resolve({ name: stackName, apiKey: stackApiKey });
        } else {
          throw new Error('Could not find stack');
        }
        return;
      }

      const stackList = Object.keys(stacks);
      stackList.push(messages.ACTION_CANCEL);

      const _chooseStack = [
        {
          type: 'list',
          name: 'chosenStack',
          message: 'Choose a Stack',
          choices: stackList,
        },
      ];

      inquirer
        .prompt(_chooseStack)
        .then((answers: Answers) => {
          const chosenStack = answers.chosenStack as string;
          if (chosenStack === messages.ACTION_CANCEL) exitProgram();
          resolve({ name: chosenStack, apiKey: stacks[chosenStack] });
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Branch Prompts
// ============================================================================

/**
 * Prompt user to choose a branch.
 */
export async function chooseBranch(branchList: Branch[]): Promise<BranchChoice> {
  try {
    const branchesArray = branchList.map((branch) => branch.uid);

    const _chooseBranch = [
      {
        type: 'list',
        name: 'branch',
        message: 'Choose a Branch',
        choices: branchesArray,
      },
    ];

    const answers = await inquirer.prompt(_chooseBranch);
    return { branch: answers.branch as string };
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
export function chooseContentType(stackAPIClient: StackClient, skip: number): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    const { getContentTypes } = await import('./api-client');
    const contentTypes = await getContentTypes(stackAPIClient, skip);
    const contentTypesList = Object.values(contentTypes);

    const _chooseContentType = [
      {
        type: 'checkbox',
        message: 'Choose Content Type (Press Space to select the content types) ',
        choices: contentTypesList,
        name: 'chosenContentTypes',
        loop: false,
      },
    ];

    inquirer
      .prompt(_chooseContentType)
      .then((answers: Answers) => resolve(answers.chosenContentTypes as string[]))
      .catch(reject);
  });
}

/**
 * Checkbox-plus source function type.
 */
type CheckboxPlusSource = (
  answersSoFar: Record<string, unknown>,
  input: string,
) => Promise<string[]>;

/**
 * Prompt user to choose content types (searchable multi-select).
 */
export function chooseInMemContentTypes(contentTypesList: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const source: CheckboxPlusSource = (_answersSoFar, input) => {
      input = input || '';
      const inputArray = input.split(' ');

      return new Promise((resolveSource) => {
        const contentTypes = contentTypesList.filter((contentType) => {
          let shouldInclude = true;
          inputArray.forEach((inputChunk) => {
            // if any term to filter by doesn't exist, exclude
            if (!contentType.toLowerCase().includes(inputChunk.toLowerCase())) {
              shouldInclude = false;
            }
          });
          return shouldInclude;
        });
        resolveSource(contentTypes);
      });
    };

    const _chooseContentType = [
      {
        type: 'checkbox-plus',
        message: 'Choose Content Type (Press Space to select the content types)',
        choices: contentTypesList,
        name: 'chosenContentTypes',
        loop: false,
        highlight: true,
        searchable: true,
        source,
      },
    ];

    inquirer
      .prompt(_chooseContentType as Parameters<typeof inquirer.prompt>[0])
      .then((answers: Answers) => {
        const chosenContentTypes = answers.chosenContentTypes as string[];
        if (chosenContentTypes.length === 0) {
          reject('Please select atleast one content type.');
        }
        resolve(chosenContentTypes);
      })
      .catch(reject);
  });
}

// ============================================================================
// Language Prompts
// ============================================================================

/**
 * Prompt user to choose a language/locale.
 */
export function chooseLanguage(stackAPIClient: StackClient): Promise<LanguageChoice> {
  return new Promise(async (resolve, reject) => {
    const languages: LanguageMap = await getLanguages(stackAPIClient);
    const languagesList = Object.keys(languages);
    languagesList.push(messages.ACTION_CANCEL);

    const _chooseLanguage = [
      {
        type: 'list',
        message: 'Choose Language',
        choices: languagesList,
        name: 'chosenLanguage',
      },
    ];

    inquirer
      .prompt(_chooseLanguage)
      .then((answers: Answers) => {
        const chosenLanguage = answers.chosenLanguage as string;
        if (chosenLanguage === messages.ACTION_CANCEL) exitProgram();
        resolve({ name: chosenLanguage, code: languages[chosenLanguage] });
      })
      .catch(reject);
  });
}

// ============================================================================
// Fallback Options Prompts
// ============================================================================

/**
 * Prompt user for fallback options.
 */
export function chooseFallbackOptions(stackAPIClient: StackClient): Promise<FallbackOptions> {
  return new Promise(async (resolve, reject) => {
    try {
      const questions = [
        {
          type: 'confirm',
          name: 'includeFallback',
          message: 'Include fallback locale data when exporting taxonomies?',
          default: false,
        },
      ];

      const firstAnswers = await inquirer.prompt(questions);
      const includeFallback = firstAnswers.includeFallback as boolean;

      let fallbackLocale: string | null = null;

      if (includeFallback) {
        // Get available languages for fallback locale selection
        const languages: LanguageMap = await getLanguages(stackAPIClient);
        const languagesList = Object.keys(languages);

        const fallbackQuestion = [
          {
            type: 'list',
            name: 'selectedFallbackLocale',
            message: 'Choose fallback locale',
            choices: languagesList,
          },
        ];

        const secondAnswers = await inquirer.prompt(fallbackQuestion);
        const selectedFallbackLocale = secondAnswers.selectedFallbackLocale as string;
        fallbackLocale = languages[selectedFallbackLocale];
      }

      resolve({
        includeFallback,
        fallbackLocale,
      });
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Team Export Prompts
// ============================================================================

/**
 * Prompt to continue exporting without certain fields.
 */
export async function promptContinueExport(): Promise<boolean> {
  const export_stack_role = [
    {
      type: 'list',
      name: 'chooseExport',
      message:
        'Access denied: Please confirm if you still want to continue exporting the data without the { Stack Name, Stack Uid, Role Name } fields.',
      choices: ['yes', 'no'],
      loop: false,
    },
  ];

  try {
    const answers = await inquirer.prompt(export_stack_role);
    return answers.chooseExport === 'yes';
  } catch (error) {
    cliux.print(error as string, { color: 'red' });
    process.exit(1);
  }
}
