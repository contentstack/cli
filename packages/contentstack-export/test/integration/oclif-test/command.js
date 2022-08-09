const { loadConfig } = require("./load-config");

const castArray = (input) => {
  if (input === undefined) return [];
  return Array.isArray(input) ? input : [input];
}

function command(commandInstance = { run: () => Promise.resolve() }, args, opts = {}) {
  return {
    async run(ctx) {
      // eslint-disable-next-line require-atomic-updates
      if (!ctx.config || opts.reset) {
        ctx.config = await loadConfig(opts).run({});
      }

      args = castArray(args);
      const [id, ...extra] = args;
      // eslint-disable-next-line require-atomic-updates
      ctx.expectation = ctx.expectation || `runs ${args.join(' ')}`;
      await ctx.config.runHook('init', { id, argv: extra });
      await commandInstance.run(args)
      // await ctx.config.runCommand(id, extra);
    }
  }
}

exports.command = command;
