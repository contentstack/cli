import chalk from 'chalk';
import { default as inquirer, QuestionCollection } from 'inquirer';
import { Table } from '@oclif/core/lib/cli-ux';
import { ux as cliux, Args, Flags, Command } from '@oclif/core';

import messageHandler from './message-handler';
import { PrintOptions, InquirePayload, CliUXPromptOptions } from './interfaces';

/**
 * CLI Interface
 */
class CLIInterface {
  private loading: boolean;

  constructor() {
    this.loading = false;
  }

  get uxTable(): typeof Table.table {
    return cliux.table;
  }

  init(context) {}

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

  loader(message: string = ''): void {
    if (!this.loading) {
      cliux.action.start(messageHandler.parse(message));
    } else {
      cliux.action.stop(messageHandler.parse(message));
    }
    this.loading = !this.loading;
  }

  table(
    data: Record<string, unknown>[],
    columns: Table.table.Columns<Record<string, unknown>>,
    options?: Table.table.Options,
  ): void {
    cliux.table(data, columns, options);
  }

  async inquire<T>(inquirePayload: InquirePayload): Promise<T> {
    inquirePayload.message = messageHandler.parse(inquirePayload.message);
    const result = await inquirer.prompt(inquirePayload as QuestionCollection<T>);

    return result[inquirePayload.name] as T;
  }

  prompt(name: string, options?: CliUXPromptOptions): Promise<any> {
    return cliux.prompt(name, options);
  }

  confirm(message?: string): Promise<boolean> {
    return cliux.confirm(message);
  }

  progress(options?: any): any {
    return cliux.progress(options);
  }
}

export default new CLIInterface();

export {Flags, Args, Command};
