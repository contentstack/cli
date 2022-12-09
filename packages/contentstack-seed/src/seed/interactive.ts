const inquirer = require('inquirer');
import { Organization, Stack } from './contentstack/client';

export interface InquireStackResponse {
  isNew: boolean;
  name: string | null;
  uid: string | null;
  api_key: string | null;
}

export async function inquireRepo(repos: any[]): Promise<{ choice: string }> {
  if (!repos || repos.length === 0) throw new Error('Precondition failed: No Repositories found.');

  if (repos.length === 1) {
    return { choice: extractRepoName(repos[0].html_url) };
  }

  const choices = repos.map((r) => {
    return { name: formatStackName(r.name), value: extractRepoName(r.html_url) };
  });

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Select a Stack to Import',
      choices,
    },
  ]);

  return response;
}

export async function inquireOrganization(organizations: Organization[]): Promise<Organization> {
  if (!organizations || organizations.length === 0) throw new Error('Precondition failed: No Organizations found.');

  if (organizations.length === 1) {
    return organizations[0];
  }

  const choices = organizations.map((r) => {
    return { name: r.name, value: r.uid };
  });

  const response = await inquirer.prompt([
    {
      type: 'list',
      name: 'uid',
      message: 'Select an Organization',
      choices,
    },
  ]);

  return organizations.find((r) => r.uid === response.uid) as Organization;
}

export async function inquireProceed(): Promise<number> {
  const createResponse = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'choice',
      message: 'This Stack contains content. Do you wish to continue?',
    },
  ]);

  return createResponse.choice;
}

export async function inquireStack(stacks: Stack[], stackName?: string): Promise<InquireStackResponse> {
  const result = {} as InquireStackResponse;
  const hasStacks = stacks !== null && stacks.length > 0;

  if (hasStacks && !stackName) {
    const createResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Create a new Stack or use existing',
        choices: [
          {
            name: 'New',
            value: true,
          },
          {
            name: 'Existing',
            value: false,
          },
        ],
      },
    ]);

    result.isNew = createResponse.choice;
  } else {
    result.isNew = true;
  }

  if (result.isNew) {
    if (stackName) result.name = stackName.trim();
    else {
      const nameResponse = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter a stack name',
          validate: function (input: string) {
            if (!input || input.trim() === '') {
              return 'Required';
            }
            return true;
          },
        },
      ]);
      result.name = nameResponse.name.trim();
    }
  } else {
    // project stacks into the format the prompt function requires
    const choices = stacks.map((s) => {
      return { name: `${s.name}`, value: s.uid };
    });

    choices.sort((a, b) => (a.name > b.name ? 1 : -1));

    const selectResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'uid',
        message: 'Select a Stack',
        choices: choices,
      },
    ]);

    const stack = stacks.find((r) => r.uid === selectResponse.uid) as Stack;

    result.name = stack.name;
    result.uid = stack.uid;
    result.api_key = stack.api_key;
  }

  return result;
}

function formatStackName(name: string) {
  return name
    .replace('stack-', '')
    .replace(/-/g, ' ')
    .replace(/(?:^|\s)\S/g, (match) => {
      return match.toUpperCase();
    });
}

function extractRepoName(gitHubUrl: string) {
  const parts = gitHubUrl.split('/');
  return parts[parts.length - 1];
}
