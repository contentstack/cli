import { Config, Plugin } from '@contentstack/cli-utilities';

export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<unknown>;
  transformer?: (value: unknown) => unknown;
}

export interface Region {
  name: string;
  cma: string;
  cda: string;
}

export interface Context {
  id: string;
  user: {
    authtoken: string;
    email: string;
  };
  region: Region;
  plugin: Plugin;
  config: Record<string, unknown>;
  info: Record<string, unknown>;
  messageFilePath: string;
}
export interface CLIConfig extends Config {
  context: Context;
}

export interface IVersionUpgradeCache {
  lastChecked: number;
  lastWarnedDate: string;
  latestVersion: string;
}
export interface IVersionUpgradeWarningFrequency {
  versionSyncDuration: number;
}
