import axios from 'axios'
import { Stream } from 'stream'
import * as path from 'path'
import * as zlib from 'zlib'
import * as tar from 'tar'
import * as mkdirp from 'mkdirp'
import GithubError from './error'

const DEFAULT_BRANCH = 'master'

export interface Repo {
  user: string;
  name: string;
  branch?: string;
}

export default class GitHubClient {
  readonly gitTarBallUrl: string;

  readonly repo: Repo;

  static parsePath(gitPath?: string): Repo {
    const result = {
      user: '',
      name: '',
    }

    if (gitPath) {
      const parts = gitPath.split('/')
      result.user = parts[0]
      if (parts.length === 2) {
        result.name = parts[1]
      }
    }

    return result
  }

  constructor(repo: Repo) {
    this.repo = repo
    this.gitTarBallUrl = `https://github.com/${repo.user}/${repo.name}/archive/${repo.branch || DEFAULT_BRANCH}.tar.gz`
  }

  async getLatest(destination: string): Promise<void> {
    const releaseStream = await this.streamRelease(this.gitTarBallUrl)
    await mkdirp(destination)
    return this.extract(destination, releaseStream)
  }

  async streamRelease(url: string): Promise<Stream> {
    const response = await axios.get(url, {
      responseType: 'stream',
    })

    return response.data as Stream
  }

  async extract(destination: string, stream: Stream): Promise<any> {
    return new Promise((resolve, reject) => {
      stream
        .pipe(zlib.createUnzip())
        .pipe(
          tar.extract({
            cwd: destination,
            strip: 1,
          })
        )
        .on('end', () => {
          resolve('done')
        })
        .on('error', reject)
    })
  }

  private buildError(error: any) {
    const message = error.response.data?.error_message || error.response.statusText
    const status = error.response.status
    return new GithubError(message, status)
  }
}
