import { Command } from '@oclif/core/lib/interfaces';
import { Interfaces } from '@oclif/core';
import { loadConfig } from './load-config';
export declare function command(commandInstance: Command.Class, args: string[] | string, opts?: loadConfig.Options): {
    run(ctx: {
        config: Interfaces.Config;
        expectation: string;
    }): Promise<void>;
};
