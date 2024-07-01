jest.mock('../src/seed/github/client');
jest.mock('../src/seed/contentstack/client');
jest.mock('../src/seed/interactive');
jest.mock('tmp');
jest.mock('@contentstack/cli-utilities');
jest.mock('inquirer');

import GitHubClient from '../src/seed/github/client';
import ContentstackClient, { Organization } from '../src/seed/contentstack/client';
import ContentModelSeeder, { ContentModelSeederOptions } from '../src/seed';
import { inquireOrganization, inquireProceed, inquireStack, inquireRepo } from '../src/seed/interactive';

import * as tmp from 'tmp';
import { cliux } from '@contentstack/cli-utilities';
import * as config from './config.json';

const org_name = 'Test Organization';
const org_uid = 'xxxxxxxxxx';
const api_key = config.api_key;
const tmpDirName = '/var/tmp/xxxxxx/';
const repo = 'stack-gatsby-blog';

const options: ContentModelSeederOptions = {
  cdaHost: '',
  cmaHost: '',
  gitHubPath: '',
};

// @ts-ignore
cli = {
  debug: jest.fn(),
  error: jest.fn(),
  action: {
    start: jest.fn(),
    stop: jest.fn(),
  },
};

const mockParsePath = jest.fn().mockReturnValue({
  username: 'fakeUserName55',
  repo: repo,
});

GitHubClient.parsePath = mockParsePath;

describe('ContentModelSeeder', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should create temp folder and download release', async () => {
    // @ts-ignore
    const dirSyncMock = jest.spyOn(tmp, 'dirSync').mockReturnValue({
      name: tmpDirName,
    });

    GitHubClient.prototype.getLatest = jest.fn().mockResolvedValue(true);

    const seeder = new ContentModelSeeder(options);
    const tmpDir = await seeder.downloadRelease();

    expect(dirSyncMock).toHaveBeenCalled();
    expect(cliux.loader).toHaveBeenCalled();
    expect(GitHubClient.prototype.getLatest).toHaveBeenCalledWith(repo, tmpDirName);
    expect(cliux.loader).toHaveBeenCalled();
    expect(tmpDir).toBe(tmpDirName);
  });

  test('should automatically proceed when no content types', async () => {
    ContentstackClient.prototype.getContentTypeCount = jest.fn().mockResolvedValue(0);

    const seeder = new ContentModelSeeder(options);
    const proceed = await seeder.shouldProceed(api_key);

    expect(proceed).toBe(true);
  });

  test('should not proceed when content types exists and user cancels', async () => {
    ContentstackClient.prototype.getContentTypeCount = jest.fn().mockResolvedValue(1);

    // @ts-ignore
    inquireProceed.mockReturnValue(false);

    const seeder = new ContentModelSeeder(options);
    const proceed = await seeder.shouldProceed(api_key);

    expect(proceed).toBe(false);
  });

  test('should proceed when content types exists and user accepts risk', async () => {
    ContentstackClient.prototype.getContentTypeCount = jest.fn().mockResolvedValue(1);

    // @ts-ignore
    inquireProceed.mockReturnValue(true);

    const seeder = new ContentModelSeeder(options);
    const proceed = await seeder.shouldProceed(api_key);

    expect(proceed).toBe(true);
  });

  test('should create stack', async () => {
    ContentstackClient.prototype.createStack = jest.fn().mockResolvedValue({
      api_key: api_key,
    });

    const organization: Organization = {
      enabled: true,
      name: org_name,
      uid: org_uid,
    };

    const seeder = new ContentModelSeeder(options);
    const result = await seeder.createStack(organization, 'Test Stack');

    expect(cliux.loader).toHaveBeenCalled();
    expect(ContentstackClient.prototype.createStack).toHaveBeenCalled();
    expect(cliux.loader).toHaveBeenCalled();
    expect(result).toBe(api_key);
  });

  test('should throw error when user does not have access to any organizations', async () => {
    ContentstackClient.prototype.getOrganizations = jest.fn().mockResolvedValue([]);

    try {
      const seeder = new ContentModelSeeder(options);
      await seeder.getInput();

      throw new Error('Failed');
    } catch (error) {
      expect(error.message).toMatch(/You do not have access/gi);
    }
  });

  test('should throw error when template folder does not exist in github', async () => {
    ContentstackClient.prototype.getOrganizations = jest.fn().mockResolvedValue([{ uid: org_uid }]);
    GitHubClient.prototype.checkIfRepoExists = jest.fn().mockResolvedValue(false);

    const seeder = new ContentModelSeeder(options);
    await seeder.getInput();
    expect(cliux.error).toHaveBeenCalled();
  });

  test('should prompt for input when organizations and github folder exists', async () => {
    GitHubClient.prototype.checkIfRepoExists = jest.fn().mockResolvedValue(true);
    ContentstackClient.prototype.getOrganizations = jest.fn().mockResolvedValue([{ uid: org_uid }]);
    ContentstackClient.prototype.getStacks = jest.fn().mockResolvedValue([{ uid: api_key }]);

    // @ts-ignore
    inquireOrganization.mockReturnValue({ uid: org_uid });

    // @ts-ignore
    inquireStack.mockReturnValue({ uid: api_key });

    const seeder = new ContentModelSeeder(options);
    const result = await seeder.getInput();

    expect(inquireOrganization).toHaveBeenCalled();
    expect(ContentstackClient.prototype.getStacks).toHaveBeenCalledWith(org_uid);
    expect(inquireStack).toHaveBeenCalled();

    expect(result).toHaveProperty('organizationResponse');
    expect(result).toHaveProperty('stackResponse');
  });

  test('should test inquire GitHub repo and filter out not stacks', async () => {
    const repos = [
      {
        name: 'stack-this-is-a-test',
        html_url: 'account/stack-this-is-a-test',
      },
      {
        name: 'stack-this-is-cool',
        html_url: 'account/stack-this-is-cool',
      },
      {
        name: 'ignore-this',
        html_url: 'account/ignore-this',
      },
    ];

    // @ts-ignore
    GitHubClient.prototype.getAllRepos = jest.fn().mockResolvedValue(repos);

    const seeder = new ContentModelSeeder(options);
    await seeder.inquireGitHubRepo();

    expect(inquireRepo).toBeCalled();
  });
});
