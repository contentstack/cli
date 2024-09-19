export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
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

export interface RateLimitConfig {
  getLimit?: {
    value: number;
    utilize: number;
  };
  limit?: {
    value: number;
    utilize: number;
  };
  bulkLimit?: {
    value: number;
    utilize: number;
  };
}

export interface SetRateLimitConfig {
  org: string;
  utilize?: number;
  limitName?: string[];
  default?: boolean;
  host?: string;
}
