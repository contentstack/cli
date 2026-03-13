import { Interfaces, Config } from '@oclif/core';

export interface LoadConfigOptions {
  root?: string;
  reset?: boolean;
}

type LoadConfigFn = ((opts?: LoadConfigOptions) => {
  run(ctx: { config?: Interfaces.Config }): Promise<Interfaces.Config>;
}) & {
  root: string;
};

/**
 * loads CLI plugin/multi config
 * @param {LoadConfigOptions} opts options
 * @return {Promise<Interfaces.Config>} config
 */
export const loadConfig = ((opts: LoadConfigOptions = {}) => {
  return {
    async run(ctx: { config?: Interfaces.Config }) {
      ctx.config = await Config.load(opts.root || loadConfig.root);
      return ctx.config;
    },
  };
}) as LoadConfigFn;

loadConfig.root = '';
