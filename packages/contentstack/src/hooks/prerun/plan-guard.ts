import {
  configHandler,
  assertFeatureEnabled,
  FeatureCtx,
  FeatureStatus,
  log,
  handleAndLogError,
  cliux,
} from '@contentstack/cli-utilities';

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

  const planProtectedCommands: Record<string, string[]> =
    config?.context?.plugin?.config?.planProtectedCommands ?? {};

  const requiredFeatures: string[] = planProtectedCommands[commandId];
  if (!requiredFeatures || requiredFeatures.length === 0) return;

  // Resolve alias → management token
  const aliasFromArgv = getArgvFlag(argv, '--alias', '-a');

  // Clone uses different flag names — handle both alias forms
  const cloneSourceAlias =
    commandId === 'cm:stacks:clone'
      ? getArgvFlag(argv, '--source-management-token-alias') ??
        getArgvFlag(argv, '--destination-management-token-alias')
      : undefined;

  const alias = aliasFromArgv ?? cloneSourceAlias;
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

  const canCheckNow =
    (!!managementToken && !!apiKeyFromAlias) ||
    isOAuth ||
    (isBasic && !!(apiKeyFromArgv || orgUid));

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
  for (const featureUid of requiredFeatures) {
    try {
      const result = await assertFeatureEnabled(featureUid, ctx);
      planStatus[featureUid] = result;
      log.debug(`[plan-guard] Feature "${featureUid}" is enabled.`, { module: 'plan-guard', commandId });
    } catch (error) {
      handleAndLogError(error, { module: 'plan-guard', commandId, featureUid });
      cliux.error((error as Error).message);
      this.exit(1);
      return;
    }
  }

  config.context.planStatus = planStatus;
}
