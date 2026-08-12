/**
 * Chalk 5 is ESM-only. We load it via dynamic import and cache for use in CommonJS.
 *
 * More than one physical copy of this package can load in one process (e.g. pnpm).
 * Cache on globalThis via Symbol.for so loadChalk() from any copy warms getChalk() for all.
 */
export type ChalkInstance = typeof import('chalk').default;

const chalkGlobal = Symbol.for('@contentstack/cli-utilities/chalk');

function readCached(): ChalkInstance | undefined {
  return (globalThis as unknown as Record<symbol, ChalkInstance | undefined>)[chalkGlobal];
}

function writeCached(chalkInstance: ChalkInstance): void {
  (globalThis as unknown as Record<symbol, ChalkInstance>)[chalkGlobal] = chalkInstance;
}

/**
 * Load chalk (ESM) and cache it. Call this once during CLI init before any chalk usage.
 */
export async function loadChalk(): Promise<ChalkInstance> {
  let chalkInstance = readCached();
  if (!chalkInstance) {
    const chalkModule = await import('chalk');
    chalkInstance = chalkModule.default;
    writeCached(chalkInstance);
  }
  return chalkInstance;
}

/**
 * Get the cached chalk instance. Must call loadChalk() first (e.g. in init hook).
 */
export function getChalk(): ChalkInstance {
  const chalkInstance = readCached();
  if (!chalkInstance) {
    throw new Error('Chalk not loaded. Ensure loadChalk() is called during init (e.g. in utils-init hook).');
  }
  return chalkInstance;
}
