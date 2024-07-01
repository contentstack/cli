jest.mock('inquirer');

const inquirer = require('inquirer');
import { Organization, Stack } from '../src/seed/contentstack/client';
import * as interactive from '../src/seed/interactive';
import * as config from './config.json';

const account = 'account';
const repo = 'repo';
const ghPath = `${account}/${repo}`;

describe('interactive', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should return error for no GitHub repos', async () => {
    try {
      expect.assertions(1);
      const repos = [] as any[];
      await interactive.inquireRepo(repos);
    } catch (error) {
      expect(error.message).toMatch(/No Repositories/);
    }
  });

  test('should return first GitHub repo when user has access to only one', async () => {
    const repos = [
      {
        html_url: ghPath,
      },
    ];

    const response = await interactive.inquireRepo(repos);

    expect(response).toStrictEqual({ choice: repo });
  });

  test('should return multiple GitHub repos if they exist', async () => {
    const repos = [
      {
        name: 'stack-this-is-a-test',
        html_url: 'account/stack-this-is-a-test',
      },
      {
        name: 'stack-this-is-cool',
        html_url: 'account/stack-this-is-cool',
      },
    ];

    // @ts-ignore
    jest.spyOn(inquirer, 'prompt').mockImplementation((options) => {
      return options;
    });

    await interactive.inquireRepo(repos);
  });

  test('should return error for no organizations', async () => {
    try {
      expect.assertions(1);
      const organizations: Organization[] = [];
      await interactive.inquireOrganization(organizations);
    } catch (error) {
      expect(error.message).toMatch(/No Organizations/);
    }
  });

  test('should return first organization when user has access to only one', async () => {
    const organizations: Organization[] = [{ enabled: true, name: 'Organization 1', uid: '1' }];

    const response = await interactive.inquireOrganization(organizations);

    expect(response).toBe(organizations[0]);
  });

  test('should return selected organization', async () => {
    const uid = 'expected_uid';

    const organizations: Organization[] = [
      { enabled: true, name: 'Organization 1', uid: '1' },
      { enabled: true, name: 'Organization 2', uid },
      { enabled: true, name: 'Organization 3', uid: '3' },
    ];

    // @ts-ignore
    jest.spyOn(inquirer, 'prompt').mockImplementation(() => {
      return { uid };
    });

    const response = await interactive.inquireOrganization(organizations);

    expect(response).toBe(organizations[1]);
  });

  test('should create new stack', async () => {
    const stacks: Stack[] = [];

    // @ts-ignore
    jest.spyOn(inquirer, 'prompt').mockImplementation(() => {
      return { name: '  Stack Name  ' };
    });

    const response = await interactive.inquireStack(stacks);

    expect(response).toStrictEqual({ isNew: true, name: 'Stack Name' });
  });

  test('should choose existing stack', async () => {
    const expected_uid = 'uid_2';

    const stacks: Stack[] = [
      { uid: 'uid_1', name: 'Stack 1', api_key: config.api_key_1, master_locale: 'en-us', org_uid: 'org_uid_1' },
      { uid: expected_uid, name: 'Stack 2', api_key: config.api_key_2, master_locale: 'en-us', org_uid: 'org_uid_2' },
      { uid: 'uid_3', name: 'Stack 3', api_key: config.api_key_3, master_locale: 'en-us', org_uid: 'org_uid_3' },
    ];

    // select existing stack
    // @ts-ignore
    jest
      .spyOn(inquirer, 'prompt')
      .mockImplementationOnce(() => {
        return { choice: false };
        // @ts-ignore
      })
      .mockImplementationOnce(() => {
        return { uid: expected_uid };
      });

    const response = await interactive.inquireStack(stacks);

    expect(response).toStrictEqual({
      isNew: false,
      name: stacks[1].name,
      uid: stacks[1].uid,
      api_key: stacks[1].api_key,
    });
  });
});
