import { logLevels } from "../constants/logging";

export interface IPromptOptions {
  prompt?: string;
  type?: 'normal' | 'mask' | 'hide' | 'single';
  timeout?: number;
  required?: boolean;
  default?: string;
}
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

export interface LoggerConfig {
  basePath: string;               // Base path for log storage
  processName?: string;           // Optional name of the plugin/process
  consoleLoggingEnabled?: boolean; // Should logs be printed to console
  consoleLogLevel?: LogType;      // Console log level (info, debug, etc.)
  logLevel?: LogType;             // File log level
}

export interface PrintOptions {
  bold?: boolean;
  color?: string;
}

export type LogType = 'info' | 'warn' | 'error' | 'debug';
export type LogsType = LogType | PrintOptions | undefined;
export type MessageType = string | Error | Record<string, any> | Record<string, any>[];

export type LogLevel = keyof typeof logLevels;

export type ClassifiedError = {
  type: string;
  message: string;
  error: Record<string, any>;
  debug?: Record<string, any>;
  meta?: Record<string, string | undefined>;
  context?: string;
  hidden?: boolean;
};

export type ErrorContext = {
  operation?: string;
  component?: string;
  userId?: string;
  requestId?: string;
  email?: string;
  sessionId?: string;
  orgId?: string;
  apiKey?: string;
};

