import configHandler from '../config-handler';

// Mirrors config:set:region's own custom-region fallback (region.ts's transformUrl) —
// same heuristic, applied retroactively for a custom region that predates auth-api.
// Computed fresh on each call, never persisted back to config.
function deriveAuthFromCma(cma: string): string {
  let transformed = cma.replace('api', 'auth-api');
  if (transformed.startsWith('http')) {
    transformed = transformed.split('//')[1];
  }
  transformed = transformed.replace(/^dev\d+/, 'dev');
  transformed = transformed.endsWith('io') ? transformed.replace('io', 'com') : transformed;
  return `https://${transformed}`;
}

export function resolveAuthHost(ctx?: { region?: { endpoints?: { auth?: string }; cma?: string } }): string {
  const region = (ctx?.region ?? configHandler.get('region')) as
    | { endpoints?: { auth?: string }; cma?: string }
    | undefined;

  let authUrl = region?.endpoints?.auth;
  if (!authUrl && region?.cma) {
    authUrl = deriveAuthFromCma(region.cma);
  }

  if (!authUrl) {
    throw new Error(
      'PLAN_CHECK: Auth host is not configured for the current region. ' +
        "Re-run `csdx config:set:region` to refresh region endpoints.",
    );
  }
  return String(authUrl).replace(/\/$/, '');
}
