// Mock utilities before importing anything that uses them
jest.mock('@contentstack/cli-utilities', () => {
  const actual = jest.requireActual('@contentstack/cli-utilities');
  return {
    ...actual,
    configHandler: {
      get: jest.fn().mockReturnValue(null),
    },
    HttpClient: {
      create: jest.fn(),
    },
  };
});

// Mock dependencies
jest.mock('tar');
jest.mock('zlib');
jest.mock('mkdirp');
jest.mock('https');

import GitHubClient from '../../../src/seed/github/client';
import GithubError from '../../../src/seed/github/error';
import { HttpClient } from '@contentstack/cli-utilities';
import * as tar from 'tar';
import * as zlib from 'zlib';
import * as https from 'https';
import * as mkdirp from 'mkdirp';
import { Stream } from 'stream';

describe('GitHubClient', () => {
  let mockHttpClient: any;
  let githubClient: GitHubClient;
  const DEFAULT_STACK_PATTERN = 'stack-';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HttpClient
    mockHttpClient = {
      get: jest.fn(),
      options: jest.fn().mockReturnThis(),
      resetConfig: jest.fn(),
    };

    (HttpClient.create as jest.Mock) = jest.fn().mockReturnValue(mockHttpClient);

    githubClient = new GitHubClient('testuser', DEFAULT_STACK_PATTERN);
  });

  describe('constructor', () => {
    it('should initialize with username and default stack pattern', () => {
      const client = new GitHubClient('testuser', DEFAULT_STACK_PATTERN);
      expect(client.username).toBe('testuser');
      expect(client.gitHubRepoUrl).toBe('https://api.github.com/repos/testuser');
      expect(client.gitHubUserUrl).toContain('testuser');
      expect(client.gitHubUserUrl).toContain(DEFAULT_STACK_PATTERN);
    });

    it('should create HttpClient instance', () => {
      expect(HttpClient.create).toHaveBeenCalled();
    });
  });

  describe('parsePath', () => {
    it('should parse full path with username and repo', () => {
      const result = GitHubClient.parsePath('username/repo-name');
      expect(result.username).toBe('username');
      expect(result.repo).toBe('repo-name');
    });

    it('should parse path with only username', () => {
      const result = GitHubClient.parsePath('username');
      expect(result.username).toBe('username');
      expect(result.repo).toBe('');
    });

    it('should handle undefined path', () => {
      const result = GitHubClient.parsePath(undefined);
      expect(result.username).toBe('');
      expect(result.repo).toBe('');
    });

    it('should handle empty string', () => {
      const result = GitHubClient.parsePath('');
      expect(result.username).toBe('');
      expect(result.repo).toBe('');
    });

  });

  describe('getAllRepos', () => {
    it('should fetch all repositories successfully', async () => {
      const mockRepos = {
        data: {
          items: [
            { name: 'stack-repo1', html_url: 'https://github.com/testuser/stack-repo1' },
            { name: 'stack-repo2', html_url: 'https://github.com/testuser/stack-repo2' },
          ],
        },
      };

      mockHttpClient.get.mockResolvedValue(mockRepos);

      const result = await githubClient.getAllRepos();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('testuser'),
      );
      expect(result).toEqual(mockRepos.data.items);
    });

    it('should handle custom count parameter', async () => {
      const mockRepos = { data: { items: [] } };
      mockHttpClient.get.mockResolvedValue(mockRepos);

      await githubClient.getAllRepos(50);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
      );
    });

    it('should throw GithubError on API failure', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error_message: 'Repository not found' },
        },
      };

      mockHttpClient.get.mockRejectedValue(mockError);

      await expect(githubClient.getAllRepos()).rejects.toThrow(GithubError);
    });
  });

  describe('getLatestTarballUrl', () => {
    it('should fetch latest release tarball URL', async () => {
      const mockRelease = {
        data: {
          tarball_url: 'https://api.github.com/repos/testuser/repo/tarball/v1.0.0',
        },
      };

      mockHttpClient.get.mockResolvedValue(mockRelease);

      const result = await githubClient.getLatestTarballUrl('repo');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'https://api.github.com/repos/testuser/repo/releases/latest',
      );
      expect(result).toBe(mockRelease.data.tarball_url);
    });

    it('should throw GithubError on failure', async () => {
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error_message: 'Release not found' },
        },
      };

      mockHttpClient.get.mockRejectedValue(mockError);

      await expect(githubClient.getLatestTarballUrl('repo')).rejects.toThrow(GithubError);
    });
  });

  describe('streamRelease', () => {
    it('should stream release data', async () => {
      const mockStream = new Stream();
      const mockResponse = {
        data: mockStream,
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await githubClient.streamRelease('https://example.com/tarball.tar.gz');

      expect(mockHttpClient.options).toHaveBeenCalledWith({
        responseType: 'stream',
      });
      expect(mockHttpClient.get).toHaveBeenCalled();
      expect(mockHttpClient.resetConfig).toHaveBeenCalled();
      expect(result).toBe(mockStream);
    });
  });

  describe('extract', () => {
    it('should extract tarball to destination', async () => {
      const mockStream = new Stream();
      const mockUnzip = new Stream();
      const mockExtract = new Stream();

      (zlib.createUnzip as jest.Mock) = jest.fn().mockReturnValue(mockUnzip);
      (tar.extract as jest.Mock) = jest.fn().mockReturnValue(mockExtract);

      // Mock pipe chain
      mockStream.pipe = jest.fn().mockReturnValue(mockUnzip);
      mockUnzip.pipe = jest.fn().mockReturnValue(mockExtract);
      mockExtract.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockExtract;
      });

      await githubClient.extract('/tmp/dest', mockStream);

      expect(zlib.createUnzip).toHaveBeenCalled();
      expect(tar.extract).toHaveBeenCalledWith({
        cwd: '/tmp/dest',
        strip: 1,
      });
    });

    it('should reject on extraction error', async () => {
      const mockStream = new Stream();
      const mockUnzip = new Stream();
      const mockExtract = new Stream();

      (zlib.createUnzip as jest.Mock) = jest.fn().mockReturnValue(mockUnzip);
      (tar.extract as jest.Mock) = jest.fn().mockReturnValue(mockExtract);

      mockStream.pipe = jest.fn().mockReturnValue(mockUnzip);
      mockUnzip.pipe = jest.fn().mockReturnValue(mockExtract);
      mockExtract.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Extraction failed')), 0);
        }
        return mockExtract;
      });

      await expect(githubClient.extract('/tmp/dest', mockStream)).rejects.toThrow(
        'Extraction failed',
      );
    });
  });

  describe('getLatest', () => {
    it('should download and extract latest release', async () => {
      const mockTarballUrl = 'https://api.github.com/repos/testuser/repo/tarball/v1.0.0';
      const mockStream = new Stream();

      jest.spyOn(githubClient, 'getLatestTarballUrl').mockResolvedValue(mockTarballUrl);
      jest.spyOn(githubClient, 'streamRelease').mockResolvedValue(mockStream);
      jest.spyOn(githubClient, 'extract').mockResolvedValue(undefined);

      (mkdirp as any).mockResolvedValue(undefined);

      await githubClient.getLatest('repo', '/tmp/dest');

      expect(githubClient.getLatestTarballUrl).toHaveBeenCalledWith('repo');
      expect(githubClient.streamRelease).toHaveBeenCalledWith(mockTarballUrl);
      expect(mkdirp).toHaveBeenCalledWith('/tmp/dest');
      expect(githubClient.extract).toHaveBeenCalledWith('/tmp/dest', mockStream);
    });
  });

  describe('makeHeadApiCall', () => {
    it('should make HEAD request to check repository', (done) => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn(),
      };

      (https.request as jest.Mock) = jest.fn().mockImplementation((options, callback) => {
        callback(mockResponse);
        return {
          on: jest.fn(),
          end: jest.fn(),
        };
      });

      githubClient.makeHeadApiCall('repo').then((response: any) => {
        expect(https.request).toHaveBeenCalled();
        expect(response).toBe(mockResponse);
        done();
      });
    });

    it('should handle request errors', (done) => {
      const mockError = new Error('Network error');

      (https.request as jest.Mock) = jest.fn().mockReturnValue({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            callback(mockError);
          }
        }),
        end: jest.fn(),
      });

      githubClient.makeHeadApiCall('repo').catch((error: any) => {
        expect(error).toBe(mockError);
        done();
      });
    });
  });

  describe('makeGetApiCall', () => {
    it('should make GET request and return response data', (done) => {
      const mockResponse = {
        statusCode: 200,
        rawHeaders: ['X-RateLimit-Reset', '1234567890'],
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from(JSON.stringify({ data: 'test' })));
          } else if (event === 'end') {
            callback();
          }
        }),
      };

      (https.request as jest.Mock) = jest.fn().mockImplementation((options, callback) => {
        callback(mockResponse);
        return {
          on: jest.fn(),
          end: jest.fn(),
        };
      });

      githubClient.makeGetApiCall('repo').then((response: any) => {
        expect(response.statusCode).toBe(200);
        expect(response.data).toEqual({ data: 'test' });
        done();
      });
    });


    it('should handle request errors', (done) => {
      const mockError = new Error('Network error');

      (https.request as jest.Mock) = jest.fn().mockReturnValue({
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            callback(mockError);
          }
        }),
        end: jest.fn(),
      });

      githubClient.makeGetApiCall('repo').catch((error: any) => {
        expect(error).toBe(mockError);
        done();
      });
    });
  });

  describe('checkIfRepoExists', () => {
    it('should return true if repository exists', async () => {
      jest.spyOn(githubClient, 'makeHeadApiCall').mockResolvedValue({
        statusCode: 200,
      } as any);

      const result = await githubClient.checkIfRepoExists('repo');

      expect(result).toBe(true);
      expect(githubClient.makeHeadApiCall).toHaveBeenCalledWith('repo');
    });

    it('should return false if repository does not exist', async () => {
      jest.spyOn(githubClient, 'makeHeadApiCall').mockResolvedValue({
        statusCode: 404,
      } as any);

      const result = await githubClient.checkIfRepoExists('repo');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      jest.spyOn(githubClient, 'makeHeadApiCall').mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await githubClient.checkIfRepoExists('repo');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
