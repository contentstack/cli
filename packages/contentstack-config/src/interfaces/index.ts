export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  transformer?: Function;
}

export interface Region {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
  developerHubUrl: string;
  personalizeUrl: string;
  launchHubUrl: string;
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
