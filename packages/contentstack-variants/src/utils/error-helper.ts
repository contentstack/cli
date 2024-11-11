/**
 * Formats the errors into a single string.
 * @param errors - The errors to be formatted.
 * @returns The formatted errors as a string.
 */
export function formatErrors(errors: any): string {
  const errorMessages: string[] = [];

  for (const errorKey in errors) {
    const errorValue = errors[errorKey];
    if (Array.isArray(errorValue)) {
      errorMessages.push(...errorValue.map((error: any) => formatError(errorKey, error)));
    } else {
      errorMessages.push(formatError(errorKey, errorValue));
    }
  }

  return errorMessages.join(' ');
}

function formatError(errorKey: string, error: any): string {
  if (typeof error === 'object' && error !== null) {
    return `${errorKey}: ${Object.values(error).join(' ')}`;
  }
  return `${errorKey}: ${error}`;
}
