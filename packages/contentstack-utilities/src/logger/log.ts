import * as path from 'path';
import { default as Logger } from './logger';
import { CLIErrorHandler } from './cli-error-handler';
import { ErrorContext } from '../interfaces';
import { configHandler } from '..';

let loggerInstance: Logger | null = null;

function createLoggerInstance(): Logger {
  const config = {
    basePath: getLogPath(),
    logLevel: configHandler.get('log.level') || 'info',
  };
  return new Logger(config);
}

// Lazy proxy object that behaves like a Logger
const v2Logger = new Proxy({} as Logger, {
  get(_, prop: keyof Logger) {
    if (!loggerInstance) {
      loggerInstance = createLoggerInstance();
    }
    const targetProp = loggerInstance[prop];
    if (typeof targetProp === 'function') {
      return targetProp.bind(loggerInstance);
    }
    return targetProp;
  },
});

const cliErrorHandler = new CLIErrorHandler(); // Enable debug mode for error classification

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
  const apiError = classified.error?.message || classified?.message || 'Unknown error';

  // Always log the error
  v2Logger.logError({
    type: classified.type,
    message: errorMessage ? `${errorMessage}\nAPI Error: ${apiError}` : `${apiError}`,
    error: classified.error,
    context: typeof classified.context === 'string' ? { message: classified.context } : classified.context,
    hidden: classified.hidden,
    meta: classified.meta,
  });
}

function getLogPath(): string {
  return process.env.CS_CLI_LOG_PATH || configHandler.get('log.path') || path.join(__dirname, 'logs');
}

export { v2Logger, cliErrorHandler, handleAndLogError, getLogPath };
