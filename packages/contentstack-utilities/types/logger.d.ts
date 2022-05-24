import * as winston from 'winston';
declare class LoggerService {
    name: string;
    data: object | null;
    logger: winston.Logger;
    static dateFormat(): string;
    constructor(name: string);
    init(context: any): void;
    set loggerName(name: string);
    setLogData(data: object): void;
    info(message: string, param?: any): Promise<any>;
    debug(message: string, param?: any): Promise<any>;
    error(message: string, param?: any): Promise<any>;
    warn(message: string, param?: any): Promise<any>;
}
declare const _default: LoggerService;
export default _default;
