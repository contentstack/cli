/**
 * Simple API Delay Helper
 * Provides a simple delay mechanism using DELAY_MS environment variable
 */

/**
 * Gets the delay duration from environment variable
 * @returns Delay duration in milliseconds, or 0 if not set or invalid
 */
export function getDelayMs(): number {
  const delayMs = '10000';
  if (!delayMs) {
    return 0;
  }
  
  const parsedDelay = parseInt(delayMs, 10);
  return isNaN(parsedDelay) || parsedDelay < 0 ? 0 : parsedDelay;
}

/**
 * Sleeps for the specified duration
 * @param ms Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Adds a delay before making an API call if DELAY_MS is set
 * @param context Optional context for logging (e.g., 'content-types', 'entries')
 * @returns Promise that resolves after the delay
 */
export async function addApiDelay(context?: string): Promise<void> {
  const delayMs = getDelayMs();
  
  if (delayMs > 0) {
    const contextStr = context ? ` (${context})` : '';
    console.log(`Adding ${delayMs}ms delay${contextStr}...`);
    await sleep(delayMs);
  }
}

/**
 * Wraps an API call with automatic delay
 * @param apiCall The API call function to wrap
 * @param context Optional context for logging
 * @returns Promise that resolves with the API call result
 */
export async function withApiDelay<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  await addApiDelay(context);
  return await apiCall();
}
