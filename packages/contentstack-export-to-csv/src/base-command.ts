/**
 * Base command for export-to-csv package.
 * Provides common functionality and context for all commands.
 */

import { Command } from '@contentstack/cli-command';
import { configHandler, log } from '@contentstack/cli-utilities';

/**
 * Context for logging and error handling.
 * Uses index signature for compatibility with ErrorContext.
 */
export interface CommandContext {
  [key: string]: unknown;
  command: string;
  module: string;
  userId: string;
  email: string;
  sessionId?: string;
  apiKey?: string;
  orgId: string;
}

export abstract class BaseCommand extends Command {
  public commandContext!: CommandContext;

  /**
   * Initialize the command with context and logging.
   */
  public async init(): Promise<void> {
    await super.init();
    this.commandContext = this.createCommandContext();
    log.debug('Command initialized', this.commandContext);
  }

  /**
   * Handle errors from the command.
   */
  protected async catch(err: Error & { exitCode?: number }): Promise<unknown> {
    log.debug('Command error caught', { ...this.commandContext, error: err.message });
    return super.catch(err);
  }

  /**
   * Cleanup after command execution.
   */
  protected async finally(_: Error | undefined): Promise<unknown> {
    log.debug('Command finished', this.commandContext);
    return super.finally(_);
  }

  /**
   * Create context object for logging and error handling.
   */
  protected createCommandContext(apiKey?: string): CommandContext {
    return {
      command: this.id || 'cm:export-to-csv',
      module: 'export-to-csv',
      userId: (configHandler.get('userUid') as string) || '',
      email: (configHandler.get('email') as string) || '',
      sessionId: undefined,
      apiKey: apiKey || '',
      orgId: (configHandler.get('oauthOrgUid') as string) || '',
    };
  }
}
