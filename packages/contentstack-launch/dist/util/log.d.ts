import winston from "winston";
import { PrintOptions } from "@contentstack/cli-utilities/types/interfaces";
import { LoggerType, PrintType } from "../types";
export default class Logger {
    private infoLogger;
    private errorLogger;
    private config;
    get loggerOptions(): winston.transports.FileTransportOptions;
    constructor(config: Record<string, any>);
    /**
     * @method getLoggerInstance - init/generate new winston logger instance
     *
     * @param {LoggerType} logType
     * @return {*}  {winston.Logger}
     * @memberof Logger
     */
    getLoggerInstance(logType: LoggerType): winston.Logger;
    /**
     * @method log - log/print message with log type (error, info, warn)
     *
     * @param {(string | any)} message
     * @param {(LoggerType | PrintOptions | undefined)} [logType]
     * @memberof Logger
     */
    log(message: string | any, logType?: LoggerType | PrintOptions | undefined): void;
    /**
     * @method returnString - formate error and return as string without any credentials
     *
     * @param {*} message
     * @return {*}  {string}
     * @memberof Logger
     */
    returnString(message: any): string;
}
/**
 * @method print - print message on UI
 *
 * @export print
 * @param {Array<PrintType>} printInput
 */
export declare function print(printInput: Array<PrintType>): void;
