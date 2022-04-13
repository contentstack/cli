jest.mock('axios');
jest.mock('mkdirp');

import axios from 'axios';
import GitHubClient from '../src/seed/github/client';
import * as mkdirp from 'mkdirp';

const owner = 'owner';
const repo = 'repo';
const url = 'http://www.google.com';

describe('GitHub', () => {
  test('should test parsePath', () => {
    expect(GitHubClient.parsePath('')).toStrictEqual({ repo: '', username: '' });
    expect(GitHubClient.parsePath('owner')).toStrictEqual({ repo: '', username: 'owner' });
    expect(GitHubClient.parsePath('owner/repo')).toStrictEqual({ repo: 'repo', username: 'owner' });
  });

  test('should set GitHub repository', () => {
    const client = new GitHubClient(owner);
    expect(client.gitHubRepoUrl).toBe(`https://api.github.com/repos/${owner}`);
  });

  test('should test getAllRepos', async () => {
    const client = new GitHubClient(owner);
    const getMock = jest.spyOn(axios, 'get');
    const repos = [{ name: 'ignored' }, { name: 'ignored' }];

    // @ts-ignore
    getMock.mockReturnValue({ data: repos });

    const result = await client.getAllRepos(100);

    expect(getMock).toBeCalled();
    expect(result).toStrictEqual(repos);
  });

  test('should check GitHub folder existence', async () => {
    const client = new GitHubClient(owner);
    const headMock = jest.spyOn(axios, 'head');

    // @ts-ignore
    headMock.mockReturnValueOnce({ status: 200 }).mockImplementationOnce({ status: 404 });

    const doesExist = await client.checkIfRepoExists(repo);
    const doesNotExist = await client.checkIfRepoExists(repo);

    expect(doesExist).toBe(true);
    expect(doesNotExist).toBe(false);
    expect(headMock).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/contents`);
  });

  test('should get latest tarball url', async () => {
    const client = new GitHubClient(owner);
    const getMock = jest.spyOn(axios, 'get');

    // @ts-ignore
    getMock.mockReturnValue({ data: { tarball_url: url } });

    const response = await client.getLatestTarballUrl(repo);

    expect(getMock).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    expect(response).toBe(url);
  });

  test('should get latest', async () => {
    const destination = '/var/tmp';

    const client = new GitHubClient(owner);
    const getLatestTarballUrlMock = jest.spyOn(client, 'getLatestTarballUrl');
    const streamReleaseMock = jest.spyOn(client, 'streamRelease');
    const extractMock = jest.spyOn(client, 'extract');

    // @ts-ignore
    getLatestTarballUrlMock.mockReturnValue(url);

    // @ts-ignore
    extractMock.mockResolvedValue({});

    await client.getLatest(repo, destination);

    expect(getLatestTarballUrlMock).toHaveBeenCalledWith(repo);
    expect(streamReleaseMock).toHaveBeenCalledWith(url);
    expect(extractMock).toHaveBeenCalled();
    expect(mkdirp).toHaveBeenCalledWith(destination);
  });

  test('should test error condition', async () => {
    const client = new GitHubClient(owner);
    const getMock = jest.spyOn(axios, 'get');

    // @ts-ignore
    getMock.mockRejectedValue({ response: { status: 500, data: { error_message: 'error occurred' } } });

    await expect(client.getAllRepos(100)).rejects.toThrow('error occurred');
  });
});
