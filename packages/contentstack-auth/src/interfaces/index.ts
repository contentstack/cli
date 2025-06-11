// eslint-disable-next-line @typescript-eslint/no-redeclare
export interface AuthOptions {
  contentstackClient: any;
}

export interface ContentStackManagementClient {
  contentstackClient: object;
}

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

export interface User {
  email: string;
  authtoken: string;
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