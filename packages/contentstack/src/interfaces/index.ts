import { Config, Plugin } from '@contentstack/cli-utilities';

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
}

export interface Context {
  id: string;
  user: {
    authtoken: string;
    email: string;
  };
  region: any;
  plugin: Plugin;
  config: any;
  info: any;
  messageFilePath: any;
}
export interface CLIConfig extends Config {
  context: Context;
}
