import first from 'lodash/first';
import split from 'lodash/split';
import replace from 'lodash/replace';
import { Command,Interfaces, toStandardizedId } from '@oclif/core';

import { loadConfig, LoadConfigOptions } from './load-config';

const castArray = <T>(input?: T | T[]): T[] => {
  if (input === undefined) return [];
  return Array.isArray(input) ? input : [input];
};

export function command(
  commandInstance: Command.Class,
  args: string[] | string,
  opts: LoadConfigOptions = {},
): {
  run(ctx: { config: Interfaces.Config; expectation: string }): Promise<void>;
} {
  return {
    async run(ctx: { config: Interfaces.Config; expectation: string }) {
      if (!ctx.config || opts.reset) ctx.config = await loadConfig(opts).run({});
      args = castArray(args);
      const exampleText = String(first(commandInstance.examples));
      const [id] = split(replace(exampleText, '$ csdx ', ''), ' ');
      const cmdId = toStandardizedId(id, ctx.config);
      ctx.expectation = ctx.expectation || `runs ${args.join(' ')}`;
      await ctx.config.runHook('init', { id: cmdId, argv: args });

      await commandInstance.run(args);
    },
  };
}
