import { HttpClient } from '../http-client';
import { resolveAuthHost } from './resolve-auth-host';
import { buildAuthHeaders } from './build-auth-headers';
import { FeatureStatus, FeatureCtx } from './types';

export async function isFeatureEnabled(featureUid: string, ctx?: FeatureCtx): Promise<FeatureStatus> {
  const host = resolveAuthHost(ctx);
  const headers = buildAuthHeaders(ctx);

  const client = new HttpClient();
  client.baseUrl(host).headers(headers);

  const res = await client.get<FeatureStatus>(
    `/v1/feature-status?feature_uid=${encodeURIComponent(featureUid)}`,
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`PLAN_CHECK: feature-status API returned ${res.status} for "${featureUid}".`);
  }

  return res.data as FeatureStatus;
}

export async function assertFeatureEnabled(featureUid: string, ctx?: FeatureCtx): Promise<FeatureStatus> {
  let status: FeatureStatus;
  try {
    status = await isFeatureEnabled(featureUid, ctx);
  } catch (e) {
    throw new Error(
      `Could not verify your plan for "${featureUid}". ` +
        `This command requires a confirmed plan status to run. ` +
        `Please retry; if the problem persists contact support. (${(e as Error).message})`,
    );
  }

  if (!status.is_part_of_plan) {
    throw new Error(
      `"${featureUid}" is not part of your current plan. Please upgrade your plan to use this feature.`,
    );
  }

  if (status.status !== 'enabled') {
    throw new Error(
      `"${featureUid}" is not enabled for your plan (status: ${status.status}).`,
    );
  }

  return status;
}
