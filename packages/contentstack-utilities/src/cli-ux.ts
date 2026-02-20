import chalk, { Chalk } from 'chalk';
import inquirer from 'inquirer';
import { ux as cliux, Args, Flags, Command } from '@oclif/core';
import { Ora, default as ora } from 'ora';
import cliProgress from 'cli-progress';
import CLITable, { TableFlags, TableHeader, TableData, TableOptions } from './cli-table';

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

      cliux.stdout(chalkFn(messageHandler.parse(message)));
      return;
    }

    cliux.stdout(messageHandler.parse(message));
  }

  success(message: string): void {
    cliux.stdout(chalk.green(messageHandler.parse(message)));
  }

  error(message: string, ...params: any): void {
    cliux.stdout(chalk.red(messageHandler.parse(message) + (params && params.length > 0 ? ': ' : '')), ...params);
  }

  loader(message: string = ''): void {
    if (!this.loading) {
      cliux.action.start(messageHandler.parse(message));
    } else {
      cliux.action.stop(messageHandler.parse(message));
    }
    this.loading = !this.loading;
  }

  table<T extends Record<string, unknown>>(
    headers: TableHeader[],
    data: TableData<T>,
    flags?: TableFlags,
    options?: TableOptions,
  ): void {
    CLITable.render(headers, data, flags, options);
  }

  async inquire<T>(inquirePayload: InquirePayload | Array<InquirePayload>): Promise<T> {
    if (Array.isArray(inquirePayload)) {
      return inquirer.prompt(inquirePayload) as Promise<T>;
    } else {
      inquirePayload.message = messageHandler.parse(inquirePayload.message);
      const result = await inquirer.prompt(inquirePayload as any);
      return result[inquirePayload.name] as T;
    }
  }

  async prompt(message: string, options?: CliUXPromptOptions): Promise<any> {
    return await this.inquire({
      type: 'input',
      name: 'prompt',
      message,
    });
  }

  async confirm(message?: string): Promise<boolean> {
    return await this.inquire({
      type: 'confirm',
      name: 'prompt',
      message,
    });
  }

  progress(options?: any): any {
    return new cliProgress.SingleBar(options);
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
