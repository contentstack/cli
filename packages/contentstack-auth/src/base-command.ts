import { Command } from '@contentstack/cli-command';
import { FlagInput, Flags, Interfaces, LoggerService } from '@contentstack/cli-utilities';

export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  public logger!: LoggerService;
  protected args!: Args<T>;
  protected flags!: Flags<T>;


  /**
   * The `init` function initializes the command by parsing arguments and flags, registering search
   * plugins, registering the configuration, and initializing the logger.
   */
  public async init(): Promise<void> {
    await super.init();
    // Init logger
    this.logger = new LoggerService(process.cwd(), 'cli-log');
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
}