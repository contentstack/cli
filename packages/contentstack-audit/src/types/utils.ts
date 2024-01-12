import { Color } from "chalk";
import { PrintOptions } from "@contentstack/cli-utilities";

import config from "../config";

type LogFn = (
  message: string | any,
  logType?: LoggerType | PrintOptions | undefined
) => void;

type ExitFn = (code?: number | undefined) => void;

type Partial<T> = {
  [P in keyof T]?: T[P];
};

type ConfigType = {
  config?: string;
} & typeof config &
  Record<string, any>;

export { LogFn, ExitFn, Partial, ConfigType };
export type LoggerType = "info" | "warn" | "error" | "debug";

export type PrintType = {
  message: string;
  bold?: boolean;
  color?: typeof Color;
};

export type JSONFlagOptions = {
  hidden?: boolean;
  description?: string;
};