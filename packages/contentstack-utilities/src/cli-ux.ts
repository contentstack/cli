import chalk, { Chalk } from 'chalk';
import { default as inquirer, QuestionCollection, Answers } from 'inquirer';
import { Table } from '@oclif/core/lib/cli-ux';
import { ux as cliux, Args, Flags, Command } from '@oclif/core';
import { Ora, default as ora } from 'ora';

import messageHandler from './message-handler';
import { PrintOptions, InquirePayload, CliUXPromptOptions } from './interfaces';

inquirer.registerPrompt('table', require('./inquirer-table-prompt'));

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

  registerSearchPlugin(): void {
    inquirer.registerPrompt('search-list', require('inquirer-search-list'));
    inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'));
  }

  print(message: string, opts?: PrintOptions): void {
    if (opts) {
      let chalkFn: Chalk = chalk;

      if (opts.color) chalkFn = chalkFn[opts.color] as Chalk;
      if (opts.bold) chalkFn = chalkFn.bold as Chalk;

      cliux.log(chalkFn(messageHandler.parse(message)));
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
    cliux.log('\n');
    cliux.table(data, columns, options);
    cliux.log('\n');
  }

  async inquire<T>(inquirePayload: InquirePayload | Array<InquirePayload>): Promise<T> {
    if (Array.isArray(inquirePayload)) {
      return inquirer.prompt(inquirePayload);
    } else {
      inquirePayload.message = messageHandler.parse(inquirePayload.message);
      const result = await inquirer.prompt(inquirePayload as QuestionCollection<Answers>);
      return result[inquirePayload.name] as T;
    }
  }

  prompt(name: string, options?: CliUXPromptOptions): Promise<any> {
    return cliux.prompt(name, options);
  }

  confirm(message?: string): Promise<boolean> {
    return cliux.confirm(message as string);
  }

  progress(options?: any): any {
    return cliux.progress(options);
  }

  loaderV2(message: string = '', spinner?: any): Ora | void {
    if (!spinner) {
      return ora(message).start();
    } else {
      spinner.text = message;
      spinner.stop();
    }
  }
}

export default new CLIInterface();
export { Flags, Args, Command };
