export interface FeatureStatus {
  org_uid: string;
  feature_key: string;
  status: 'enabled' | 'disabled' | string;
  limit: number;
  max_limit: number;
  is_part_of_plan: boolean;
}

export interface FeatureCtx {
  apiKey?: string;
  orgUid?: string;
  managementToken?: string;
  authToken?: string;
  region?: { authUrl?: string; name?: string; cma?: string };
}
