/**
 * Message handler
 */
declare class Messages {
    private messages;
    messageFilePath: any;
    constructor();
    init(context: any): void;
    parse(messageKey: string, ...substitutions: Array<any>): string;
}
declare const _default: Messages;
export default _default;
