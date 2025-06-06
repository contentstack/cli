import { AxiosError } from 'axios';
import { ClassifiedError, ErrorContext } from '../interfaces';
import { formatError } from '../helpers';
import { ERROR_TYPES } from '../constants/errorTypes';

/**
 * Handles errors in a CLI application by classifying, normalizing, and extracting
 * relevant information for debugging and logging purposes.
 *
 * This class provides methods to:
 * - Normalize unknown error types into standard `Error` objects.
 * - Classify errors into predefined categories such as API errors, network errors,
 *   server errors, and more.
 * - Extract detailed error payloads for logging, including HTTP request and response
 *   details when applicable.
 * - Identify sensitive information in error messages to prevent accidental exposure.
 * - Generate debug payloads for enhanced troubleshooting when debugging is enabled.
 *
 * @remarks
 * This class is designed to handle a wide range of error types, including generic
 * JavaScript errors, API errors, and custom error objects. It also supports
 * optional debugging and context metadata for enhanced error reporting.
 *
 * @example
 * ```typescript
 * const errorHandler = new CLIErrorHandler(true);
 *
 * try {
 *   // Some operation that may throw an error
 * } catch (error) {
 *   const classifiedError = errorHandler.classifyError(error, {
 *     operation: 'fetchData',
 *     component: 'DataService',
 *   });
 *   console.error(classifiedError);
 * }
 * ```
 *
 * @public
 */
export default class CLIErrorHandler {
  private isDebug: boolean;

  constructor(isDebug = false) {
    this.isDebug = isDebug;
  }

  /**
   * Classifies an error into a structured format for better handling and debugging.
   *
   * @param error - The error object to classify. Can be of any type.
   * @param context - Optional additional context about the error, typically used to provide
   *                  more information about where or why the error occurred.
   *
   * @returns A `ClassifiedError` object containing details about the error, including its type,
   *          message, payload, context, metadata, and whether it contains sensitive information.
   *          If the error is an API error or debugging is enabled, additional debug information
   *          is included.
   *
   * @throws This method handles its own errors and will return a `ClassifiedError` with type
   *         `ERROR_TYPES.NORMALIZATION` if it fails to normalize or classify the input error.
   */
  classifyError(error: unknown, context?: ErrorContext, errMessage?: string): ClassifiedError {
    try {
      const normalized = this.normalizeToError(error);
      const isApi = this.isApiError(normalized);
      const type = this.determineErrorType(normalized);
      const hidden = this.containsSensitiveInfo(normalized);

      const result: ClassifiedError = {
        type,
        message: errMessage || normalized.message || 'Unhandled error',
        error: this.extractErrorPayload(normalized),
        context: context ? JSON.stringify(context) : undefined,
        meta: this.extractMeta(context),
        hidden,
      };

      if (isApi || this.isDebug) {
        result.debug = this.extractDebugPayload(normalized, context);
      }

      return result;
    } catch (e) {
      return {
        type: ERROR_TYPES.NORMALIZATION,
        message: 'Failed to normalize or classify error',
        error: { message: String(e) },
        context: context ? JSON.stringify(context) : undefined,
        meta: this.extractMeta(context),
        hidden: false,
      };
    }
  }

  private normalizeToError(error: unknown): Error {
    if (!error) return new Error('Unknown error occurred');
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);

    if (typeof error === 'object') {
      try {
        const msg = (error as any).message;
        const err = new Error(msg || 'Unknown error');
        Object.assign(err, error);
        return err;
      } catch {
        return new Error(JSON.stringify(error));
      }
    }

    return new Error(String(error));
  }

  private isApiError(error: Error): boolean {
    if ((error as AxiosError).isAxiosError) return true;

    return (
      typeof (error as any).status === 'number' ||
      typeof (error as any).statusText === 'string' ||
      (error as any).request !== undefined
    );
  }

  private determineErrorType(error: Error & Record<string, any>): string {
    const status = error.status || error.response?.status;

    //Ignore 4XX errors
    if (status >= 400 && status < 500) {
      return ERROR_TYPES.API_ERROR;
    }

    //Server-side HTTP errors
    if (status >= 500) {
      return ERROR_TYPES.SERVER_ERROR;
    }

    //Network-related error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return ERROR_TYPES.NETWORK;
    }

    //Database error
    if (error.name === 'DatabaseError') {
      return ERROR_TYPES.DATABASE;
    }

    //Axios errors without 4XX
    if ((error as AxiosError).isAxiosError) {
      return ERROR_TYPES.NETWORK;
    }

    //Default
    return ERROR_TYPES.APPLICATION;
  }

  private extractErrorPayload(error: Error & Record<string, any>): Record<string, any> {
    const code = error.code || error.errorCode;
    const status = error.status || error.response?.status;
    const statusText = error.statusText || error.response?.statusText;
    const method = error.request?.method || error.config?.method || 'UNKNOWN';
    const url = error.request?.url || error.config?.url;
    const endpoint = url ? new URL(url, 'http://dummy').pathname : 'UNKNOWN';

    const payload: Record<string, any> = {
      name: error.name,
      message: formatError(error),
      code,
      status,
      statusText,
      method,
      endpoint,
    };

    return payload;
  }

  private extractDebugPayload(error: Error & Record<string, any>, context?: ErrorContext): Record<string, any> {
    const method = error.request?.method || error.config?.method;
    const url = error.request?.url || error.config?.url;
    const status = error.status || error.response?.status;
    const statusText = error.statusText || error.response?.statusText;
    const data = error.data || error.response?.data || error.errors || error.error;
    
    return {
      command: context?.operation,
      module: context?.component,
      request: {
        method,
        url,
        headers: error.request?.headers,
        data: error.request?.data,
      },
      response: {
        status,
        statusText,
        data,
      },
    };
  }

  private extractMeta(context?: ErrorContext): Record<string, string | undefined> {
    return {
      email: context?.email,
      sessionId: context?.sessionId,
      userId: context?.userId,
      apiKey: context?.apiKey,
      orgId: context?.orgId,
    };
  }

  private containsSensitiveInfo(error: Error): boolean {
    try {
      const content = `${error.message} ${error.stack || ''}`.toLowerCase();
      return [
        'password',
        'token',
        'secret',
        'credentials',
        'api_key',
        'api-key',
        'authorization',
        'sessionid',
        'email',
      ].some((term) => content.includes(term));
    } catch {
      return false;
    }
  }
}

export { CLIErrorHandler };
