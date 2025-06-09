export interface AnyProperty {
  [propName: string]: any;
}

export interface LogType {
  (message: any): void;
  (config: any, message: any, type: 'info' | 'error' | 'success'): void;
}

export interface Context {
  command: string;
  module: string;
  userId: string | undefined;
  email: string | undefined;
  sessionId: string | undefined;
  clientId: string | undefined;
  apiKey: string;
  orgId: string;
}