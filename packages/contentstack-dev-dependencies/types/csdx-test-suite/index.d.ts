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
        args: [number];
    };
} & {
    catch: {
        output: {
            error: Error;
        };
        args: [string | RegExp | ((err: Error) => any), {
            raiseIfNotThrown?: boolean;
        }?];
    };
} & {
    env: {
        output: unknown;
        args: [{
            [k: string]: string;
        }, FancyTypes.EnvOptions?];
    };
} & {
    stub: {
        output: {
            stubs: any[];
        };
        args: [any, any, () => any];
    };
} & {
    stdin: {
        output: unknown;
        args: [string, number?];
    };
} & {
    stderr: {
        output: {
            readonly stderr: string;
        };
        args: [{
            print?: boolean;
            stripColor?: boolean;
        }?];
    };
} & {
    stdout: {
        output: {
            readonly stdout: string;
        };
        args: [{
            print?: boolean;
            stripColor?: boolean;
        }?];
    };
} & {
    nock: {
        output: {
            nock: number;
        };
        args: [string, FancyTypes.NockOptions | FancyTypes.NockCallback, FancyTypes.NockCallback?];
    };
} & {
    timeout: {
        output: {
            timeout: number;
        };
        args: [number?];
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
