import configHandler from '../config-handler';

export function resolveAuthHost(ctx?: { region?: { authUrl?: string } }): string {
  const region = (ctx?.region ?? configHandler.get('region')) as { authUrl?: string } | undefined;
  const authUrl = region?.authUrl;
  if (!authUrl) {
    throw new Error(
      'PLAN_CHECK: Auth host is not configured for the current region. ' +
        "Re-run `csdx config:set:region` to refresh region endpoints.",
    );
  }
  return String(authUrl).replace(/\/$/, '');
}
