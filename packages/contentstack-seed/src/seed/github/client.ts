import * as tar from 'tar';
import * as zlib from 'zlib';
import * as https from 'https';
import { Stream } from 'stream';
import mkdirp = require('mkdirp');
import { HttpClient } from '@contentstack/cli-utilities';

import GithubError from './error';

export default class GitHubClient {
  readonly gitHubRepoUrl: string;
  readonly gitHubUserUrl: string;
  private readonly httpClient: HttpClient;

  static parsePath(path?: string) {
    const result = {
      username: '',
      repo: '',
    };

    if (path) {
      const parts = path.split('/');
      result.username = parts[0];

      if (parts.length === 2) {
        result.repo = parts[1];
      }
    }

    return result;
  }

  constructor(public username: string, defaultStackPattern: string) {
    this.gitHubRepoUrl = `https://api.github.com/repos/${username}`;
    this.gitHubUserUrl = `https://api.github.com/search/repositories?q=org%3A${username}+in:name+${defaultStackPattern}`;
    this.httpClient = HttpClient.create();
  }

  async getAllRepos(count = 100) {
    try {
      const response = await this.httpClient.get(`${this.gitHubUserUrl}&per_page=${count}`);
      return response.data.items;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getLatest(repo: string, destination: string): Promise<void> {
    const tarballUrl = await this.getLatestTarballUrl(repo);
    const releaseStream = await this.streamRelease(tarballUrl);

    await mkdirp(destination);

    return this.extract(destination, releaseStream);
  }

  makeHeadApiCall(repo: string) {
    return new Promise<any>((resolve, reject) => {
      const { host, pathname } = new URL(this.gitHubRepoUrl);
      const options = {
        host,
        method: 'HEAD',
        path: `${pathname}/${repo}/contents`,
        headers: { 'user-agent': 'node.js' },
      };

      https.request(options, resolve).on('error', reject).end();
    });
  }

  makeGetApiCall(repo: string) {
    return new Promise<any>((resolve, reject) => {
      const { host, pathname } = new URL(this.gitHubRepoUrl);
      const options = {
        host,
        method: 'GET',
        path: `${pathname}/${repo}/contents`,
        headers: { 'user-agent': 'node.js' },
      };

      https.request(options, (response) => {
        let responseBody = '';
        const data: any = {  statusCode: response.statusCode, };
        if (data.statusCode === 403) {
          const xRateLimitReset = response.rawHeaders[response.rawHeaders.indexOf('X-RateLimit-Reset') + 1];
          const startDate = (new Date()).getTime() / 1000;
          const diffInSeconds = Number(xRateLimitReset) - startDate;
          data.statusMessage = `Exceeded requests limit. Please try again after ${(diffInSeconds / 60).toFixed(1)} minutes.`;
        }
        response.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        response.on('end', () => {
          const body = JSON.parse(responseBody);
          resolve({ ...data, data: body });
        });
      }).on('error', reject).end();
    });
  }

  async checkIfRepoExists(repo: string) {
    try {
      /**
       * Old code. Keeping it for reference.
       *
       * `const response: any = await this.httpClient.send('HEAD', `${this.gitHubRepoUrl}/${repo}/contents`);`
       *
       * `return response.status === 200;`
       */
      const response: Record<string, any> = await this.makeHeadApiCall(repo);
      return response.statusCode === 200;
    } catch (error) {
      console.log(error);
      // do nothing
    }

    return false;
  }

  async getLatestTarballUrl(repo: string) {
    try {
      const response = await this.httpClient.get(`${this.gitHubRepoUrl}/${repo}/releases/latest`);
      return response.data.tarball_url;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async streamRelease(url: string): Promise<Stream> {
    const response = await this.httpClient
      .options({
        responseType: 'stream',
      })
      .get(url);
    this.httpClient.resetConfig();
    return response.data as Stream;
  }

  async extract(destination: string, stream: Stream): Promise<void> {
    return new Promise((resolve, reject) => {
      stream
        .pipe(zlib.createUnzip())
        .pipe(
          tar.extract({
            cwd: destination,
            strip: 1,
          }),
        )
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  private buildError(error: any) {
    const message = error.response.data?.error_message || error.response.statusText;
    const status = error.response.status;
    return new GithubError(message, status);
  }
}
