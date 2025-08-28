import { AxiosError } from 'axios';
import { ClassifiedError, ErrorContext } from '../interfaces';
import { formatError } from '../helpers';
import { ERROR_TYPES } from '../constants/errorTypes';
import { redactObject } from '../helpers';

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
 * const errorHandler = new CLIErrorHandler();
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
  constructor() {}

  /**
   * Classifies an error into a structured format for better handling and debugging.
   *
   * @param error - The error object to classify. Can be of any type.
   * @param context - Optional additional context about the error.
   * @param errMessage - Optional custom error message to override the default error message.
   *
   * @returns A `ClassifiedError` object containing essential error details in a clear,
   *          concise format optimized for debugging.
   */
  classifyError(error: unknown, context?: ErrorContext, errMessage?: string): ClassifiedError {
    try {
      const normalized = this.normalizeToError(error);
      const type = this.determineErrorType(normalized);
      const hidden = this.containsSensitiveInfo(normalized);

      const result: ClassifiedError = {
        type,
        message: errMessage || this.extractClearMessage(normalized),
        error: this.extractErrorPayload(normalized),
        meta: this.extractMeta(context, type),
        hidden,
      };

      return result;
    } catch (e) {
      return {
        type: ERROR_TYPES.NORMALIZATION,
        message: 'Failed to process error',
        error: {
          originalError: String(e),
          errorType: typeof error,
        },
        meta: this.extractMeta(context, ERROR_TYPES.NORMALIZATION),
        hidden: false,
      };
    }
  }

  /**
   * Extracts a clear, concise error message from various error types.
   */
  private extractClearMessage(error: Error & Record<string, any>): string {
    if (error?.response?.data?.errorMessage) {
      return error.response.data.errorMessage;
    }

    if (error?.errorMessage) {
      return error.errorMessage;
    }

    // Use existing formatError function for other cases
    try {
      const formattedMessage = formatError(error);

      return formattedMessage || 'An error occurred. Please try again.';
    } catch {
      // Fallback to basic error message extraction if formatError fails
      if (typeof error?.response?.data?.errorMessage === 'string') {
        return error.response.data.errorMessage;
      }

      if (typeof error?.errorMessage === 'string') {
        return error.errorMessage;
      }
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
        const errorObj = error as Record<string, any>;
        const message = errorObj.message || errorObj.error || errorObj.statusText || 'Unknown error';
        const normalizedError = new Error(message);

        // Only copy essential properties
        const essentialProps = [
          'code',
          'status',
          'statusText',
          'response',
          'request',
          'message',
          'errorMessage',
          'error_message',
          'error',
          'errors',
        ];
        essentialProps.forEach((prop) => {
          if (errorObj[prop] !== undefined) {
            (normalizedError as any)[prop] = errorObj[prop];
          }
        });

        return normalizedError;
      } catch {
        return new Error(JSON.stringify(error));
      }
    }

    return new Error(String(error));
  }

  /**
   * Determines the type of error based on its characteristics.
   */
  private determineErrorType(error: Error & Record<string, any>): string {
    const { status, code, name, response } = error;
    const actualStatus = status || response?.status;

    // Network and timeout errors
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ENETUNREACH'].includes(code)) {
      return ERROR_TYPES.NETWORK;
    }

    // HTTP status-based classification
    if (actualStatus) {
      if (actualStatus >= 100 && actualStatus < 200) return ERROR_TYPES.INFORMATIONAL;
      if (actualStatus >= 300 && actualStatus < 400) return ERROR_TYPES.REDIRECTION;
      if (actualStatus >= 400 && actualStatus < 500) return ERROR_TYPES.API_ERROR;
      if (actualStatus >= 500) return ERROR_TYPES.SERVER_ERROR;
    }

    // Specific error types
    if (name === 'DatabaseError') return ERROR_TYPES.DATABASE;
    if ((error as AxiosError).isAxiosError) return ERROR_TYPES.NETWORK;

    return ERROR_TYPES.APPLICATION;
  }

  /**
   * Extracts only essential error payload information for clear debugging.
   */
  private extractErrorPayload(error: Error & Record<string, any>): Record<string, any> {
    const { name, message, code, status, response, request, config, statusText } = error;

    const payload: Record<string, any> = {
      name,
      message: this.extractClearMessage(error),
    };

    // Add error identifiers
    if (code) payload.code = code;
    if (status || response?.status) payload.status = status || response?.status;

    // Add detailed field-level errors if available
    if (response?.data?.errors && typeof response.data.errors === 'object') {
      payload.errors = response.data.errors;
    } else if (error?.errors && typeof error.errors === 'object') {
      payload.errors = error.errors;
    }

    // Add error code if available
    if (response?.data?.error_code) {
      payload.errorCode = response.data.error_code;
    } else if (error?.error_code) {
      payload.errorCode = error.error_code;
    }

    // Add request context with sensitive data redaction
    if (request || config) {
      const requestData = {
        method: request?.method || config?.method,
        url: request?.url || config?.url,
        headers: request?.headers || config?.headers,
        data: request?.data || config?.data,
        timeout: config?.timeout,
        baseURL: config?.baseURL,
        params: config?.params,
      };

      // Use existing redactObject to mask sensitive data
      payload.request = redactObject(requestData);
    }

    // Add response context with sensitive data redaction
    if (response) {
      const responseData = {
        status,
        statusText,
        headers: response.headers,
        data: response.data,
      };

      // Use existing redactObject to mask sensitive data
      payload.response = redactObject(responseData);
    }

    // Extract user-friendly error message for API errors
    if (response?.data?.errorMessage) {
      payload.userFriendlyMessage = response.data.errorMessage;
    }

    // Add stack trace only for non-API errors to avoid clutter
    if (
      ![ERROR_TYPES.API_ERROR, ERROR_TYPES.SERVER_ERROR].includes(
        this.determineErrorType(error) as typeof ERROR_TYPES.API_ERROR | typeof ERROR_TYPES.SERVER_ERROR,
      )
    ) {
      payload.stack = error.stack?.split('\n').slice(0, 5).join('\n');
    }

    return payload;
  }

  /**
   * Extracts metadata from the error context and adds additional information.
   *
   * @param context - The error context to extract metadata from
   * @param errorType - Optional error type to include in metadata
   * @returns An object containing relevant metadata for debugging
   */
  private extractMeta(context?: ErrorContext, errorType?: string): Record<string, string | undefined> {
    if (!context) return {};

    const baseMeta: Record<string, string | undefined> = {};

    if (context.operation) baseMeta.operation = context.operation;
    if (context.component) baseMeta.component = context.component;
    if (context.userId) baseMeta.userId = context.userId;
    if (context.sessionId) baseMeta.sessionId = context.sessionId;
    if (context.orgId) baseMeta.orgId = context.orgId;
    if (errorType) baseMeta.errorType = errorType;
    if (context.email) baseMeta.email = context.email;

    return baseMeta;
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
        'authtoken',
        'x-api-key',
        'tfa_token',
        'otp',
        'security_code',
        'bearer',
        'cookie',
      ];

      return sensitiveTerms.some((term) => content.includes(term));
    } catch {
      return false;
    }
  }
}

export { CLIErrorHandler };
