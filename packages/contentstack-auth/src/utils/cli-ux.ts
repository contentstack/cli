import cliux from 'cli-ux';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { PrintOptions, InquirePayload } from '../interfaces';
import messageHandler from './message-handler';
import logger from './logger';

/**
 * CLI Interface
 */

class CLIUX {
  private loading: boolean;

  constructor() {
    this.loading = false;
  }

  print(message: string, opts?: PrintOptions): void {
    if (opts && opts.color) {
      cliux.log(chalk[opts.color](messageHandler.parse(message)));
      return;
    }
    cliux.log(messageHandler.parse(message));
  }

  success(message: string): void {
    cliux.log(chalk.green(messageHandler.parse(message)));
  }

  error(message: string, ...params: any): void {
    cliux.log(chalk.red(messageHandler.parse(message) + (params && params.length > 0 ? ': ' : '')), ...params);
  }

  loader(message: string): void {
    if (!this.loading) {
      cliux.action.start(messageHandler.parse(message));
    } else {
      cliux.action.stop(messageHandler.parse(message));
    }
    this.loading = !this.loading;
  }

  table(data: Array<object>, columns: any, options: object): void {
    cliux.table(data, columns, options);
  }

  async inquire<T>(inquirePayload: InquirePayload): Promise<T> {
    inquirePayload.message = messageHandler.parse(inquirePayload.message);
    const result = await inquirer.prompt(inquirePayload);
    logger.debug('inquire result', result);
    return result[inquirePayload.name] as T;
  }
}

export default new CLIUX();
