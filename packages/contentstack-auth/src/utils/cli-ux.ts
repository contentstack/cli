import cliux from 'cli-ux';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { PrintOptions, InquirePayload } from '../interfaces';

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
      cliux.log(chalk[opts.color](message));
      return;
    }
    cliux.log(message);
  }

  success(message: string): void {
    cliux.log(chalk.green(message));
  }

  error(message: string): void {
    cliux.log(chalk.red(message));
  }

  loader(message: string): void {
    if (!this.loading) {
      cliux.action.start(message);
    } else {
      cliux.action.stop(message);
    }
    this.loading = !this.loading;
  }

  table(data: Array<object>, columns: any, options: object): void {
    cliux.table(data, columns, options);
  }

  async inquire<T>(inquirePayload: InquirePayload): Promise<T> {
    const result = await inquirer.prompt(inquirePayload);
    return result[inquirePayload.name] as T;
  }
}

export default new CLIUX();
