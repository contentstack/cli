import EventEmitter from 'events';
import { ApolloClient } from '@apollo/client/core';
import { ContentstackClient, FlagInput, PrintOptions } from '@contentstack/cli-utilities';

import config from '../config';
import { LoggerType } from './utils';

type Providers = 'GitHub' | 'FileUpload';

type LogFn = (message: string | any, logType?: LoggerType | PrintOptions | undefined) => void;

type ExitFn = (code?: number | undefined) => void;

type AdapterConstructorInputs = {
  log?: LogFn;
  exit?: ExitFn;
  config: ConfigType;
  $event: EventEmitter;
  analyticsInfo: string;
  apolloClient: ApolloClient<any>;
  apolloLogsClient?: ApolloClient<any>;
  managementSdk?: ContentstackClient;
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type ConfigType = {
  cwd?: string;
  host: string;
  branch?: string;
  config?: string;
  authType: string;
  flags: FlagInput;
  framework?: string;
  authtoken?: string;
  deployment?: string;
  environment?: string;
  provider?: Providers;
  authorization?: string;
  logsApiBaseUrl: string;
  projectBasePath: string;
  manageApiBaseUrl: string;
  isExistingProject?: boolean;
  repository?: Record<string, any>;
  currentConfig: Record<string, any>;
  deliveryToken?: Record<string, any>;
} & typeof config &
  Record<string, any>;

type GraphqlHeaders = {
  'X-CS-CLI': string;
  authtoken?: string;
  'x-cs-cli-id'?: any;
  authorization?: string;
  'x-project-uid'?: string;
  organization_uid?: string;
} & Record<string, any>;

type GraphqlApiClientInput = {
  cmaHost?: string;
  baseUrl: string;
  headers?: GraphqlHeaders;
};

export {
  LogFn,
  ExitFn,
  Partial,
  Providers,
  ConfigType,
  AdapterConstructorInputs,
  GraphqlHeaders,
  GraphqlApiClientInput,
};
