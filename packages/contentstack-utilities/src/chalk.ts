/**
 * Chalk 5 is ESM-only. We load it via dynamic import and cache for use in CommonJS.
 */
let chalkInstance: typeof import('chalk').default | null = null;

export type ChalkInstance = typeof import('chalk').default;

/**
 * Load chalk (ESM) and cache it. Call this once during CLI init before any chalk usage.
 */
export async function loadChalk(): Promise<ChalkInstance> {
  if (!chalkInstance) {
    const chalkModule = await import('chalk');
    chalkInstance = chalkModule.default;
  }
  return chalkInstance;
}

/**
 * Get the cached chalk instance. Must call loadChalk() first (e.g. in init hook).
 */
export function getChalk(): ChalkInstance {
  if (!chalkInstance) {
    throw new Error('Chalk not loaded. Ensure loadChalk() is called during init (e.g. in utils-init hook).');
  }
  return chalkInstance;
}
