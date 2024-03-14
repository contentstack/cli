import { IPromptOptions } from '@oclif/core/lib/cli-ux';

export interface PrintOptions {
  bold?: boolean;
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  default?: any;
  message: string;
  choices?: Array<any>;
  transformer?: Function;
  validate?(input: any, answers?: any): boolean | string | Promise<boolean | string>;
  selectAll?: boolean;
  pageSize?: number;
  columns?: Record<string, any>[];
  rows?: Array<any>;
}

export interface Region {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
}

export interface Token {
  token: string;
  apiKey: string;
}

export interface Organization {
  uid: string;
  name: string;
}

export interface selectedOrganization {
  orgUid: string;
  orgName: string;
}

export interface Stack {
  name: string;
  api_key: string;
}

export interface ContentType {
  uid: string;
  title: string;
}

export interface Environment {
  name: string;
  uid: string;
}

export interface Entry {
  uid: string;
  title: string;
}

export interface Locale {
  name: string;
  code: string;
}

export interface CliUXPromptOptions extends IPromptOptions {}
