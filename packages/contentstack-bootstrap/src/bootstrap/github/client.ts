import { Stream } from 'stream';
import * as zlib from 'zlib';
import * as tar from 'tar';
const mkdirp = require('mkdirp')
import { HttpRequestConfig, HttpClient } from '@contentstack/cli-utilities';

import GithubError from './github-error';
import messageHandler from '../../messages';

const DEFAULT_BRANCH = 'cli-use';

export interface Repo {
  user: string;
  name: string;
  branch?: string;
}

export default class GitHubClient {
  readonly gitTarBallUrl: string;

  readonly repo: Repo;

  readonly private: boolean;

  readonly accessToken?: string;

  static parsePath(gitPath?: string): Repo {
    const result = {
      user: '',
      name: '',
    };

    if (gitPath) {
      const parts = gitPath.split('/');
      result.user = parts[0];
      if (parts.length === 2) {
        result.name = parts[1];
      }
    }

    return result;
  }

  constructor(repo: Repo, privateRepo = false, token?: string) {
    this.repo = repo;
    this.private = privateRepo;
    if (privateRepo) {
      this.accessToken = token;
    }
    this.gitTarBallUrl = `https://api.github.com/repos/${repo.user}/${repo.name}/tarball/${
      repo.branch || DEFAULT_BRANCH
    }`;
  }

  async getLatest(destination: string): Promise<void> {
    const releaseStream = await this.streamRelease(this.gitTarBallUrl);
    await mkdirp(destination);
    return this.extract(destination, releaseStream);
  }

  async streamRelease(url: string): Promise<Stream> {
    const options: HttpRequestConfig = {
      responseType: 'stream',
    };

    if (this.private) {
      if (this.accessToken) {
        options.headers = {
          Authorization: `token ${this.accessToken}`,
        };
      } else {
        throw new GithubError(messageHandler.parse('CLI_BOOTSTRAP_GITHUB_ACCESS_NOT_FOUND'), 1);
      }
    }

    const response = await HttpClient.create().options(options).get(url);
    return response.data as Stream;
  }

  async extract(destination: string, stream: Stream): Promise<any> {
    return new Promise((resolve, reject) => {
      stream
        .pipe(zlib.createUnzip())
        .pipe(
          tar.extract({
            cwd: destination,
            strip: 1,
          }),
        )
        .on('end', () => {
          resolve('done');
        })
        .on('error', reject);
    });
  }
}
