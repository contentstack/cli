import map from "lodash/map";
import winston from "winston";
import { existsSync } from "fs";
import chalk, { Chalk } from "chalk";
import replace from "lodash/replace";
import { normalize, resolve } from "path";
import isObject from "lodash/isObject";
import { cliux as ux, PrintOptions } from '@contentstack/cli-utilities';

import { LoggerType, PrintType } from "../types";

const ansiRegexPattern = [
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
].join("|");

const customLevels = {
  levels: {
    warn: 1,
    info: 2,
    debug: 3,
  },
};

export default class Logger {
  private infoLogger!: winston.Logger;
  private errorLogger!: winston.Logger;
  private config!: Record<string, any>;

  get loggerOptions(): winston.transports.FileTransportOptions {
    return {
      filename: "",
      maxFiles: 20,
      tailable: true,
      maxsize: 1000000,
    };
  }

  constructor(config: Record<string, any>) {
    this.config = config;
    this.infoLogger = this.getLoggerInstance("info");
    this.errorLogger = this.getLoggerInstance("error");
  }

  /**
   * @method getLoggerInstance - init/generate new winston logger instance
   *
   * @param {LoggerType} logType
   * @return {*}  {winston.Logger}
   * @memberof Logger
   */
  getLoggerInstance(logType: LoggerType): winston.Logger {
    const consoleOptions: winston.transports.ConsoleTransportOptions = {
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.colorize({ all: true })
      ),
    };

    if (logType === "error") {
      consoleOptions.level = logType;
    }

    if (existsSync(this.config.projectBasePath)) {
      const filename = normalize(resolve(this.config.projectBasePath, "logs", `${logType}.log`)).replace(
        /^(\.\.(\/|\\|$))+/,
        "",
      );
      const loggerOptions: winston.LoggerOptions = {
        transports: [
          new winston.transports.File({
            ...this.loggerOptions,
            level: logType,
            filename,
          }),
          new winston.transports.Console(consoleOptions),
        ],
        levels: customLevels.levels,
      };

      if (logType === "error") {
        loggerOptions.levels = { error: 0 };
      }

      return winston.createLogger(loggerOptions);
    }

    winston
      .createLogger({
        transports: [new winston.transports.Console(consoleOptions)],
      })
      .error("Provided base path is not valid");
    process.exit(1);
  }

  /**
   * @method log - log/print message with log type (error, info, warn)
   *
   * @param {(string | any)} message
   * @param {(LoggerType | PrintOptions | undefined)} [logType]
   * @memberof Logger
   */
  log(
    message: string | any,
    logType?: LoggerType | PrintOptions | undefined
  ): void {
    const logString = this.returnString(message);

    switch (logType) {
      case "info":
      case "debug":
      case "warn":
        this.infoLogger.log(logType, logString);
        break;
      case "error":
        this.errorLogger.error(logString);
        break;
      default:
        ux.print(logString, logType || {});
        break;
    }
  }

  /**
   * @method returnString - formate error and return as string without any credentials
   *
   * @param {*} message
   * @return {*}  {string}
   * @memberof Logger
   */
  returnString(message: any): string {
    let returnStr = "";

    const replaceCredentials = (item: any) => {
      try {
        return JSON.stringify(item).replace(
          /authtoken\":\"blt................/g,
          'authtoken":"blt....'
        );
      } catch (error) {}

      return item;
    };

    if (Array.isArray(message) && message.length) {
      returnStr = map(message, (item: any) => {
        if (item && typeof item === "object") {
          return replaceCredentials(item);
        }

        return item;
      })
        .join("  ")
        .trim();
    } else if (isObject(message)) {
      return replaceCredentials(message);
    } else {
      returnStr = message;
    }

    returnStr = replace(
      returnStr,
      new RegExp(ansiRegexPattern, "g"),
      ""
    ).trim();

    return returnStr;
  }
}

/**
 * @method print - print message on UI
 *
 * @export print
 * @param {Array<PrintType>} printInput
 */
export function print(printInput: Array<PrintType>): void {
  const str = map(printInput, ({ message, bold, color }: PrintType) => {
    let chalkFn: Chalk = chalk;
    if (color) chalkFn = chalkFn[color];
    if (bold) chalkFn = chalkFn.bold;

    return chalkFn(message);
  }).join(" ");

  ux.print(str);
}
