/**
 * Error handling utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import { cliux, messageHandler, log } from '@contentstack/cli-utilities';
import type { ApiError, ErrorWithMessage, TaxonomyError } from '../types';

/**
 * Format an error into a user-friendly message.
 *
 * Handles various error formats from the Contentstack API:
 * - String errors
 * - Error objects with `message` property
 * - Error objects with `errorMessage` property
 * - Error objects with `errors` object containing field-specific errors
 */
export function formatError(error: unknown): string {
  let parsedError: ApiError | string = error as ApiError;

  try {
    if (typeof error === 'string') {
      parsedError = JSON.parse(error) as ApiError;
    } else if (error && typeof error === 'object' && 'message' in error) {
      parsedError = JSON.parse((error as Error).message) as ApiError;
    }
  } catch {
    // If parsing fails, use the original error
  }

  let message: string;
  if (typeof parsedError === 'string') {
    message = parsedError;
  } else {
    message = parsedError?.errorMessage || parsedError?.error_message || parsedError?.message || String(parsedError);
  }

  if (typeof parsedError === 'object' && parsedError?.errors && Object.keys(parsedError.errors).length > 0) {
    const errors = parsedError.errors;
    Object.keys(errors).forEach((e) => {
      let entity = e;
      switch (e) {
        case 'authorization':
          entity = 'Management Token';
          break;
        case 'api_key':
          entity = 'Stack API key';
          break;
        case 'uid':
          entity = 'Content Type';
          break;
        case 'access_token':
          entity = 'Delivery Token';
          break;
      }
      message += ' ' + [entity, errors[e]].join(' ');
    });
  }

  return message;
}

/**
 * Handle and print error messages.
 * Uses the CLI utilities handleAndLogError for consistent error handling.
 * Exits the process with code 1.
 */
export function handleErrorMsg(err: ErrorWithMessage | Error | unknown, context?: Record<string, unknown>): never {
  const errorObj = err as ErrorWithMessage;
  const errorMessage = errorObj?.errorMessage || errorObj?.message || messageHandler.parse('CLI_EXPORT_CSV_API_FAILED');

  log.debug('Error occurred', { ...context, error: errorMessage });
  cliux.print(`Error: ${errorMessage}`, { color: 'red' });

  process.exit(1);
}

/**
 * Handle taxonomy-specific errors.
 * Exits the process with code 1.
 */
export function handleTaxonomyErrorMsg(err: TaxonomyError | Error | unknown, context?: Record<string, unknown>): never {
  const errorObj = err as TaxonomyError;

  if (errorObj?.errorMessage || errorObj?.message) {
    const errorMsg = errorObj?.errorMessage || errorObj?.errors?.taxonomy || errorObj?.errors?.term || errorObj?.message;
    log.debug('Taxonomy error', { ...context, error: errorMsg });
    cliux.print(`Error: ${errorMsg}`, { color: 'red' });
  } else {
    log.debug('Unknown taxonomy error', { ...context, error: err });
    console.log(err);
    cliux.print(`Error: ${messageHandler.parse('CLI_EXPORT_CSV_API_FAILED')}`, { color: 'red' });
  }

  process.exit(1);
}

/**
 * Utility function to wait for a specified time.
 * Used for rate limiting API calls.
 */
export function wait(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

/**
 * Exit the program gracefully.
 */
export function exitProgram(): never {
  log.debug('Exiting program');
  process.exit(0);
}
