import configHandler from '../config-handler';

export interface AuthHeaders {
  [key: string]: string;
}

export function buildAuthHeaders(ctx?: {
  managementToken?: string;
  apiKey?: string;
  authToken?: string;
  orgUid?: string;
}): AuthHeaders {
  // 1. Management token takes priority (no 'Bearer' prefix — API contract)
  if (ctx?.managementToken && ctx?.apiKey) {
    return {
      Authorization: ctx.managementToken,
      api_key: ctx.apiKey,
    };
  }

  // 2. OAuth
  const oauthToken = configHandler.get('oauthAccessToken') as string | undefined;
  if (oauthToken) {
    return { Authorization: `Bearer ${oauthToken}` };
  }

  // 3. Authtoken + organization_uid
  const authtoken = ctx?.authToken ?? (configHandler.get('authtoken') as string | undefined);
  const orgUid = ctx?.orgUid ?? (configHandler.get('oauthOrgUid') as string | undefined);
  if (authtoken && orgUid) {
    return { authtoken, organization_uid: orgUid };
  }

  // 4. Authtoken + api_key
  if (authtoken && ctx?.apiKey) {
    return { authtoken, api_key: ctx.apiKey };
  }

  throw new Error(
    'PLAN_CHECK: Cannot build auth headers — no valid credentials available. ' +
      'Please log in or provide a management token alias.',
  );
}
