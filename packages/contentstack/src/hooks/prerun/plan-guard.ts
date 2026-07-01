import { configHandler, isFeatureEnabled, FeatureCtx, FeatureStatus, log } from '@contentstack/cli-utilities';

function getArgvFlag(argv: string[], ...names: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    for (const name of names) {
      if (arg === name && argv[i + 1] && !argv[i + 1].startsWith('-')) {
        return argv[i + 1];
      }
      if (arg.startsWith(`${name}=`)) {
        return arg.split('=').slice(1).join('=');
      }
    }
  }
  return undefined;
}

export default async function (opts: { Command?: { id?: string }; argv?: string[]; config?: any }): Promise<void> {
  const config = opts?.config ?? this.config;
  const commandId = opts?.Command?.id;
  const argv: string[] = opts?.argv ?? [];

  if (!commandId) return;

  const requiredFeatures: string[] = config?.context?.plugin?.config?.planProtectedFeatures ?? [];
  if (requiredFeatures.length === 0) return;

  const alias = getArgvFlag(argv, '--alias', '-a');
  let managementToken: string | undefined;
  let apiKeyFromAlias: string | undefined;
  if (alias) {
    const stored = configHandler.get(`tokens.${alias}`) as
      | { token?: string; apiKey?: string; type?: string }
      | undefined;
    if (stored?.token && stored?.apiKey && stored?.type !== 'delivery') {
      managementToken = stored.token;
      apiKeyFromAlias = stored.apiKey;
    }
  }

  const authorisationType = configHandler.get('authorisationType') as string | undefined;
  const oauthToken = configHandler.get('oauthAccessToken') as string | undefined;
  const isOAuth = authorisationType === 'OAUTH' && !!oauthToken;

  const authtoken = configHandler.get('authtoken') as string | undefined;
  const isBasic = authorisationType === 'BASIC' && !!authtoken;

  const apiKeyFromArgv = getArgvFlag(argv, '--stack-api-key', '-k');
  const orgUid = configHandler.get('oauthOrgUid') as string | undefined;

  const canCheckNow = (!!managementToken && !!apiKeyFromAlias) || isOAuth || (isBasic && !!(apiKeyFromArgv || orgUid));

  if (!canCheckNow) {
    config.context.planCheckRequired = requiredFeatures;
    log.debug(
      `[plan-guard] Deferred plan check for: ${requiredFeatures.join(', ')} — credentials not resolvable at prerun`,
      { module: 'plan-guard', commandId },
    );
    return;
  }

  const region = configHandler.get('region') as { authUrl?: string; name?: string } | undefined;
  const ctx: FeatureCtx = {
    managementToken,
    apiKey: apiKeyFromAlias ?? apiKeyFromArgv,
    authToken: authtoken,
    orgUid,
    region,
  };

  const planStatus: Record<string, FeatureStatus> = {};
  const failedFeatures: string[] = [];
  for (const featureUid of requiredFeatures) {
    try {
      planStatus[featureUid] = await isFeatureEnabled(featureUid, ctx);
      log.debug(`[plan-guard] Feature "${featureUid}" status fetched.`, { module: 'plan-guard', commandId });
    } catch (error) {
      log.warn(`[plan-guard] Could not fetch status for "${featureUid}": ${(error as Error).message}`, {
        module: 'plan-guard',
        commandId,
        featureUid,
      });
      failedFeatures.push(featureUid);
    }
  }
  config.context.planStatus = planStatus;
  if (failedFeatures.length > 0) {
    config.context.planCheckRequired = failedFeatures;
  }
}
