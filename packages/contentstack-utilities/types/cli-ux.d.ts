import { Table } from '@oclif/core/lib/cli-ux';
import { Args, Flags, Command } from '@oclif/core';
import { PrintOptions, InquirePayload, CliUXPromptOptions } from './interfaces';
/**
 * CLI Interface
 */
declare class CLIInterface {
    private loading;
    constructor();
    get uxTable(): typeof Table.table;
    init(context: any): void;
    print(message: string, opts?: PrintOptions): void;
    success(message: string): void;
    error(message: string, ...params: any): void;
    loader(message?: string): void;
    table(data: Record<string, unknown>[], columns: Table.table.Columns<Record<string, unknown>>, options?: Table.table.Options): void;
    inquire<T>(inquirePayload: InquirePayload): Promise<T>;
    prompt(name: string, options?: CliUXPromptOptions): Promise<any>;
    confirm(message?: string): Promise<boolean>;
    progress(options?: any): any;
}
declare const _default: CLIInterface;
export default _default;
export { Flags, Args, Command };
