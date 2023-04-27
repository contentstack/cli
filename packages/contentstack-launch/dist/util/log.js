"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = void 0;
const tslib_1 = require("tslib");
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const winston_1 = tslib_1.__importDefault(require("winston"));
const fs_1 = require("fs");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const replace_1 = tslib_1.__importDefault(require("lodash/replace"));
const path_1 = require("path");
const isObject_1 = tslib_1.__importDefault(require("lodash/isObject"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
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
class Logger {
    get loggerOptions() {
        return {
            filename: "",
            maxFiles: 20,
            tailable: true,
            maxsize: 1000000,
        };
    }
    constructor(config) {
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
    getLoggerInstance(logType) {
        const consoleOptions = {
            format: winston_1.default.format.combine(winston_1.default.format.simple(), winston_1.default.format.colorize({ all: true })),
        };
        if (logType === "error") {
            consoleOptions.level = logType;
        }
        if ((0, fs_1.existsSync)(this.config.projectBasePath)) {
            const filename = (0, path_1.normalize)((0, path_1.join)(this.config.projectBasePath, "logs", `${logType}.log`)).replace(/^(\.\.(\/|\\|$))+/, "");
            const loggerOptions = {
                transports: [
                    new winston_1.default.transports.File({
                        ...this.loggerOptions,
                        level: logType,
                        filename,
                    }),
                    new winston_1.default.transports.Console(consoleOptions),
                ],
                levels: customLevels.levels,
            };
            if (logType === "error") {
                loggerOptions.levels = { error: 0 };
            }
            return winston_1.default.createLogger(loggerOptions);
        }
        winston_1.default
            .createLogger({
            transports: [new winston_1.default.transports.Console(consoleOptions)],
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
    log(message, logType) {
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
                cli_utilities_1.cliux.print(logString, logType || {});
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
    returnString(message) {
        let returnStr = "";
        const replaceCredentials = (item) => {
            try {
                return JSON.stringify(item).replace(/authtoken\":\"blt................/g, 'authtoken":"blt....');
            }
            catch (error) { }
            return item;
        };
        if (Array.isArray(message) && message.length) {
            returnStr = (0, map_1.default)(message, (item) => {
                if (item && typeof item === "object") {
                    return replaceCredentials(item);
                }
                return item;
            })
                .join("  ")
                .trim();
        }
        else if ((0, isObject_1.default)(message)) {
            return replaceCredentials(message);
        }
        else {
            returnStr = message;
        }
        returnStr = (0, replace_1.default)(returnStr, new RegExp(ansiRegexPattern, "g"), "").trim();
        return returnStr;
    }
}
exports.default = Logger;
/**
 * @method print - print message on UI
 *
 * @export print
 * @param {Array<PrintType>} printInput
 */
function print(printInput) {
    const str = (0, map_1.default)(printInput, ({ message, bold, color }) => {
        let chalkFn = chalk_1.default;
        if (color)
            chalkFn = chalkFn[color];
        if (bold)
            chalkFn = chalkFn.bold;
        return chalkFn(message);
    }).join(" ");
    cli_utilities_1.cliux.print(str);
}
exports.print = print;
