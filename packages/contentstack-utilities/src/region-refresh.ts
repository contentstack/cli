import configHandler from './config-handler';
import { resolveCanonicalEndpoints, buildRegionFromEndpoints } from './region-endpoints';

/**
 * Self-heals the persisted region config on every CLI invocation so that
 * customers who set their region on an older CLI version (before a field
 * like authUrl existed) get it backfilled without re-running
 * `csdx config:set:region`. Only named/built-in regions are touched — a
 * custom region's name won't resolve via resolveCanonicalEndpoints, so it's
 * left untouched. Never throws.
 */
export function refreshRegionEndpoints(): void {
  const stored = configHandler.get('region') as ({ name?: string } & Record<string, unknown>) | undefined;
  if (!stored?.name) return;

  const endpoints = resolveCanonicalEndpoints(stored.name);
  if (!endpoints) return;

  const merged = { ...stored, ...buildRegionFromEndpoints(stored.name, endpoints) };
  if (JSON.stringify(merged) !== JSON.stringify(stored)) {
    configHandler.set('region', merged);
  }
}
