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

  constructor() {
    
  }

  /**
   * Classifies an error into a structured format for better handling and debugging.
   *
   * @param error - The error object to classify. Can be of any type.
   * @param context - Optional additional context about the error, typically used to provide
   *                  more information about where or why the error occurred.
   * @param errMessage - Optional custom error message to override the default error message.
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
      const type = this.determineErrorType(normalized);
      const hidden = this.containsSensitiveInfo(normalized);

      const result: ClassifiedError = {
        type,
        message: errMessage || normalized.message || 'Unhandled error',
        error: this.extractErrorPayload(normalized),
        meta: {
          type,
          ...(context || {}),
        } as Record<string, string | undefined>,
        hidden,
      };

      return result;
    } catch (e) {
      return {
        type: ERROR_TYPES.NORMALIZATION,
        message: 'Failed to normalize or classify error',
        error: { message: String(e) },
        meta: {
          ...(context || {}),
          ...this.extractMeta(context),
        } as Record<string, string | undefined>,
        hidden: false,
      };
    }
  }

  /**
   * Normalizes various error types into a standard Error object.
   * 
   * @param error - The error to normalize
   * @returns A normalized Error object
   */
  private normalizeToError(error: unknown): Error {
    if (!error) return new Error('Unknown error occurred');
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);

    if (typeof error === 'object') {
      try {
        const msg = (error as any).message || (error as any).error || 'Unknown error';
        const err = new Error(msg);
        Object.assign(err, error);
        return err;
      } catch {
        return new Error(JSON.stringify(error));
      }
    }

    return new Error(String(error));
  }

  /**
   * Determines the type of error based on its characteristics.
   * 
   * @param error - The error to classify
   * @returns The error type string
   */
  private determineErrorType(error: Error & Record<string, any>): string {
    const status = error.status ?? error.response?.status;
    const axiosError = error as AxiosError;
  
    const isNetworkError = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ENETUNREACH'].includes(error.code);
    const isTimeoutError = error.code === 'ETIMEDOUT' || error.message?.includes('timeout');
  
    if (status >= 400 && status < 500) {
      return ERROR_TYPES.API_ERROR;
    } else if (status >= 500) {
      return ERROR_TYPES.SERVER_ERROR;
    } else if (isNetworkError || isTimeoutError) {
      return ERROR_TYPES.NETWORK;
    } else if (error.name === 'DatabaseError') {
      return ERROR_TYPES.DATABASE;
    } else if (axiosError?.isAxiosError) {
      return ERROR_TYPES.NETWORK;
    } else {
      return ERROR_TYPES.APPLICATION;
    }
  }

  /**
   * Extracts comprehensive error payload with enhanced request/response information.
   * 
   * @param error - The error to extract payload from
   * @param context - Additional context for debugging
   * @returns Structured error payload with full debugging information
   */
  private extractErrorPayload(error: Error & Record<string, any>): Record<string, any> {
    // Handle different error structures - Axios errors have different property locations
    const axiosError = error as AxiosError;
    
    const code = error.code || error.errorCode || axiosError.code;
    const status = error.status || axiosError.response?.status || axiosError.status;
    const statusText = error.statusText || axiosError.response?.statusText;
    const method = error.request?.method || error.config?.method || 'UNKNOWN';
    const url = error.request?.url || error.config?.url || 'UNKNOWN';

    const payload: Record<string, any> = {
      name: error.name,
      message: formatError(error),
      code,
      status,
      statusText,
      method,
      url,
      errorStack: error.stack,
    };

    // Add request information if available
    if (error.request || error.config) {
      payload.request = {
        method,
        url,
        headers: error.request?.headers || error.config?.headers,
        data: error.request?.data || error.config?.data,
        timeout: error.config?.timeout,
        baseURL: error.config?.baseURL,
        params: error.config?.params,
      };
    }

    // Add response information if available
    if (error.response) {
      payload.response = {
        status,
        statusText,
        headers: error.response?.headers,
        data: error.response?.data,
      };
    }

    return payload;
  }

  /**
   * Extracts metadata from context.
   * 
   * @param context - Error context
   * @returns Metadata object
   */
  private extractMeta(context?: ErrorContext): Record<string, string | undefined> {
    return {
      email: context?.email,
      sessionId: context?.sessionId,
      userId: context?.userId,
      apiKey: context?.apiKey,
      orgId: context?.orgId,
      operation: context?.operation,
      component: context?.component,
    };
  }

  /**
   * Checks if error contains sensitive information.
   * 
   * @param error - Error to check
   * @returns True if sensitive info is found
   */
  private containsSensitiveInfo(error: Error): boolean {
    try {
      const content = `${error.message} ${error.stack || ''}`.toLowerCase();
      const sensitiveTerms = [
        'password',
        'token',
        'secret',
        'credentials',
        'api_key',
        'api-key',
        'authorization',
        'sessionid',
        'email',
        'authtoken',
        'x-api-key',
      ];
      
      return sensitiveTerms.some((term) => content.includes(term));
    } catch {
      return false;
    }
  }
}

export { CLIErrorHandler };
