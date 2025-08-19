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

export interface Context {
  command: string;
  module: string;
  userId: string | undefined;
  sessionId: string | undefined;
  clientId?: string | undefined;
  apiKey: string;
  orgId: string;
}

export interface MFAConfig {
  secret: string;
  last_updated: string;
}

export interface MFAValidationResult {
  isValid: boolean;
  error?: string;
}

export interface IMFAService {
  validateSecret(secret: string): boolean;
  getStoredConfig(): MFAConfig | null;
  storeConfig(config: MFAConfig): void;
  removeConfig(): void;
  generateMFA(secret: string): string;
}