import { Table } from '@oclif/core/lib/cli-ux';
import { PrintOptions, InquirePayload } from './interfaces';
/**
 * CLI Interface
 */
declare class CLIInterface {
    private loading;
    constructor();
    init(context: any): void;
    print(message: string, opts?: PrintOptions): void;
    success(message: string): void;
    error(message: string, ...params: any): void;
    loader(message: string): void;
    table(data: Record<string, unknown>[], columns: Table.table.Columns<Record<string, unknown>>, options?: Table.table.Options): void;
    inquire<T>(inquirePayload: InquirePayload): Promise<T>;
}
declare const _default: CLIInterface;
export default _default;
export * as CliUx from '@oclif/core/lib/cli-ux';
export { ux, ActionBase, Config, Table, ExitError, IPromptOptions, config } from '@oclif/core/lib/cli-ux';
