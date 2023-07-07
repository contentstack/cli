import { Config } from '@oclif/core';
import { expect, FancyTypes } from 'fancy-test';
import { command } from './command';
import { loadConfig } from './load-config';
export declare const test: FancyTypes.Base<FancyTypes.Context, {
    skip: {
        output: unknown;
        args: [];
    };
} & {
    only: {
        output: unknown;
        args: [];
    };
} & {
    retries: {
        output: unknown;
        args: [count: number];
    };
} & {
    catch: {
        output: {
            error: Error;
        };
        args: [arg: string | RegExp | ((err: Error) => any), opts?: {
            raiseIfNotThrown?: boolean;
        }];
    };
} & {
    env: {
        output: unknown;
        args: [env: {
            [k: string]: string;
        }, opts?: FancyTypes.EnvOptions];
    };
} & {
    stub: {
        output: {
            stubs: any[];
        };
        args: [object: any, path: any, value: () => any];
    };
} & {
    stdin: {
        output: unknown;
        args: [input: string, delay?: number];
    };
} & {
    stderr: {
        output: {
            readonly stderr: string;
        };
        args: [opts?: {
            print?: boolean;
            stripColor?: boolean;
        }];
    };
} & {
    stdout: {
        output: {
            readonly stdout: string;
        };
        args: [opts?: {
            print?: boolean;
            stripColor?: boolean;
        }];
    };
} & {
    nock: {
        output: {
            nock: number;
        };
        args: [host: string, options: FancyTypes.NockOptions | FancyTypes.NockCallback, cb?: FancyTypes.NockCallback];
    };
} & {
    timeout: {
        output: {
            timeout: number;
        };
        args: [timeout?: number];
    };
} & {
    loadConfig: {
        output: {
            config: import("@oclif/core/lib/interfaces").Config;
        };
        args: [opts?: loadConfig.Options];
    };
} & {
    command: {
        output: {
            config: import("@oclif/core/lib/interfaces").Config;
            expectation: string;
        };
        args: [commandInstance: import("@oclif/core/lib/interfaces").Command.Class, args: string | string[], opts?: loadConfig.Options];
    };
} & {
    exit: {
        output: {
            error: any;
        };
        args: [code?: number];
    };
} & {
    hook: {
        output: {
            config: import("@oclif/core/lib/interfaces").Config;
            expectation: string;
        };
        args: [event: string, hookOpts?: Record<string, unknown>, options?: loadConfig.Options];
    };
}>;
export default test;
export { expect, FancyTypes, Config, command };
