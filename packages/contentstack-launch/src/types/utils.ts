import { Color } from "chalk";
import EventEmitter from "events";
import { ApolloClient } from "@apollo/client/core";

import { ConfigType, ExitFn } from './launch';

export type LoggerType = "info" | "warn" | "error" | "debug";
export type PrintType = {
  message: string;
  bold?: boolean;
  color?: typeof Color;
};


export type LogPollingInput = {
  apolloLogsClient: ApolloClient<any>,
  apolloManageClient: ApolloClient<any>,
  config: ConfigType;
  $event?: EventEmitter;
  exit?: ExitFn;
};

export type DeploymentLogResp = {
  deploymentUid: string;
  message: string;
  stage: string;
  timestamp: string;
}

export type ServerLogResp = {
  message: string;
  level: string;
  timestamp: string;
}

export type EmitMessage = {
  message: string | DeploymentLogResp[] | ServerLogResp[] | any,
  msgType: LoggerType,
} 