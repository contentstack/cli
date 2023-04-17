declare class CustomAbortSignal {
    aborted: any;
    onabort: any;
    eventEmitter: any;
    constructor();
    toString(): string;
    get [Symbol.toStringTag](): string;
    removeEventListener(name: any, handler: any): void;
    addEventListener(name: any, handler: any): void;
    dispatchEvent(type: any): void;
}
declare class CustomAbortController {
    signal: any;
    constructor();
    abort(): void;
    toString(): string;
    get [Symbol.toStringTag](): string;
}
export { CustomAbortController, CustomAbortSignal };
