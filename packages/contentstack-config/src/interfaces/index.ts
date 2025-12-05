export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  transformer?: (value: any) => any;
}

export interface Region {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
  developerHubUrl: string;
  personalizeUrl: string;
  launchHubUrl: string;
  composableStudioUrl: string;
}

export interface Limit {
  value: number;
  utilize: number;
}

export interface RateLimitConfig {
  getLimit?: Limit;
  limit?: Limit;
  bulkLimit?: Limit;
}

export interface SetRateLimitConfig {
  org: string;
  utilize?: number;
  limitName?: string[];
  default?: boolean;
  host?: string;
}
