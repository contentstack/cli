import * as path from 'path';
import { default as Logger } from './logger';
import { CLIErrorHandler } from './cliErrorHandler';
import { ErrorContext } from '../interfaces';

const v2Logger = new Logger({ basePath: process.env.CS_CLI_LOG_PATH || path.join(process.cwd(), 'logs') });
const cliErrorHandler = new CLIErrorHandler(true); // Enable debug mode for error classification

/**
 * Handles and logs an error by classifying it and logging the relevant details.
 *
 * This function uses the `cliErrorHandler` to classify the provided error and logs
 * the error details using `v2Logger`. If debug information is available, it logs
 * additional debug details, including a stack trace if not already present.
 *
 * @param error - The error to be handled and logged. Can be of any type.
 * @param context - Optional context information to assist in error classification
 *                  and logging.
 *
 * @remarks
 * - The error is always logged with its type, message, and other metadata.
 * - If debug information is available, it is logged separately with a more specific
 *   debug type and additional details.
 */
function handleAndLogError(error: unknown, context?: ErrorContext, errorMessage?: string): void {
  const classified = cliErrorHandler.classifyError(error, context, errorMessage);

  // Always log the error
  v2Logger.logError({
    type: classified.type,
    message: errorMessage || classified.message,
    error: classified.error,
    context: classified.context,
    hidden: classified.hidden,
    meta: classified.meta,
  });

  // Log debug information if available
  if (classified.debug) {
    v2Logger.logDebug({
      type: `${classified.type}_DEBUG`, // More specific debug type
      message: `${classified.message} [DEBUG]`,
      debug: {
        ...classified.debug,
        // Ensure stack trace is included if not already there
        stackTrace: classified?.debug?.stackTrace || classified.error.stack,
      },
      context: classified.context,
      meta: classified.meta,
    });
  }
}

export { v2Logger, cliErrorHandler, handleAndLogError };
