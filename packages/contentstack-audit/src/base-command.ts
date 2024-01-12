import merge from 'lodash/merge';
import isEmpty from 'lodash/isEmpty';
import { existsSync, readFileSync } from 'fs';
import { Command } from '@contentstack/cli-command';
import { Flags, FlagInput, Interfaces, cliux, ux, PrintOptions } from '@contentstack/cli-utilities';

import config from './config';
import { Logger } from './util';
import { ConfigType, LogFn, LoggerType } from './types';
import messages, { $t, commonMsg } from './messages';

export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>;

const noLog = (_message: string | any, _logType?: LoggerType | PrintOptions | undefined) => {};

export abstract class BaseCommand<T extends typeof Command> extends Command {
  public log!: LogFn;
  public logger!: Logger;
  public readonly $t = $t;
  protected sharedConfig: ConfigType = {
    ...config,
    basePath: process.cwd(),
  };
  readonly messages: typeof messages = messages;

  protected args!: Args<T>;
  protected flags!: Flags<T>;

  // NOTE define flags that can be inherited by any command that extends BaseCommand
  static baseFlags: FlagInput = {
    config: Flags.string({
      char: 'c',
      helpGroup: 'COMMON',
      description: commonMsg.CONFIG,
    }),
    'data-dir': Flags.string({
      char: 'd',
      helpGroup: 'COMMON',
      description: commonMsg.DATA_DIR,
    }),
  };

  /**
   * The `init` function initializes the command by parsing arguments and flags, registering search
   * plugins, registering the configuration, and initializing the logger.
   */
  public async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    this.sharedConfig = Object.assign(this.sharedConfig, { flags: this.flags });

    if (!isEmpty(this.flags['external-config']?.config)) {
      this.sharedConfig = Object.assign(this.sharedConfig, this.flags['external-config']?.config);
    }

    cliux.registerSearchPlugin();
    this.registerConfig();

    // Init logger
    if (this.flags['external-config']?.noLog) {
      this.log = noLog;
      ux.action.start = () => {};
      ux.action.stop = () => {};
    } else {
      const logger = new Logger(this.sharedConfig);
      this.log = logger.log.bind(logger);
    }
  }

  /**
   * The catch function is used to handle errors from a command, either by adding custom logic or
   * returning the parent class error handling.
   * @param err - The `err` parameter is of type `Error & { exitCode?: number }`. This means that it is
   * an object that extends the `Error` class and may also have an optional property `exitCode` of type
   * `number`.
   * @returns The parent class error handling is being returned.
   */
  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

  /**
   * The `finally` function is called after the `run` and `catch` functions, regardless of whether or not
   * an error occurred.
   * @param {Error | undefined} _ - The parameter "_" represents an error object or undefined.
   * @returns The `finally` method is returning the result of calling the `finally` method of the
   * superclass, which is a promise.
   */
  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_);
  }

  /**
   * The function checks if a configuration file exists and if so, reads and parses it as JSON.
   */
  registerConfig() {
    if (this.flags.config && existsSync(this.flags.config)) {
      try {
        this.sharedConfig = merge(
          this.sharedConfig,
          JSON.parse(readFileSync(this.flags.config, { encoding: 'utf-8' })),
        );
      } catch (error) {
        this.log(error, 'error');
      }
    }
  }
}
