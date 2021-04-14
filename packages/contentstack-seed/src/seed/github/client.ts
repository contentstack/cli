import axios from 'axios'
import {Stream} from 'stream'
import * as zlib from 'zlib'
import * as tar from 'tar'
import * as mkdirp from 'mkdirp'
import GithubError from './error'

export default class GitHubClient {
  readonly gitHubRepoUrl: string;

  readonly gitHubUserUrl: string;

  static parsePath(path?: string) {
    const result = {
      username: '',
      repo: '',
    }

    if (path) {
      const parts = path.split('/')
      result.username = parts[0]

      if (parts.length === 2) {
        result.repo = parts[1]
      }
    }

    return result
  }

  constructor(public username: string) {
    this.gitHubRepoUrl = `https://api.github.com/repos/${username}`
    this.gitHubUserUrl = `https://api.github.com/users/${username}`
  }

  async getAllRepos(count = 100) {
    try {
      const response = await axios.get(`${this.gitHubUserUrl}/repos?per_page=${count}&sort=full_name&type=public`)
      return response.data
    } catch (error) {
      throw this.buildError(error)
    }
  }

  async getLatest(repo: string, destination: string): Promise<void> {
    const tarballUrl = await this.getLatestTarballUrl(repo)
    const releaseStream = await this.streamRelease(tarballUrl)

    await mkdirp(destination)

    return this.extract(destination, releaseStream)
  }

  async checkIfRepoExists(repo: string) {
    try {
      const response = await axios.head(`${this.gitHubRepoUrl}/${repo}/contents`)
      return response.status === 200
    } catch (error) {
      // do nothing
    }

    return false
  }

  async getLatestTarballUrl(repo: string) {
    try {
      const response = await axios.get(`${this.gitHubRepoUrl}/${repo}/releases/latest`)
      return response.data.tarball_url
    } catch (error) {
      throw this.buildError(error)
    }
  }

  async streamRelease(url: string): Promise<Stream> {
    const response = await axios.get(url, {
      responseType: 'stream',
    })

    return response.data as Stream
  }

  async extract(destination: string, stream: Stream): Promise<void> {
    return new Promise((resolve, reject) => {
      stream
      .pipe(zlib.createUnzip())
      .pipe(
        tar.extract({
          cwd: destination,
          strip: 1,
        })
      )
      .on('end', () => resolve())
      .on('error', reject)
    })
  }

  private buildError(error: any) {
    const message = error.response.data?.error_message || error.response.statusText
    const status = error.response.status
    return new GithubError(message, status)
  }
}
