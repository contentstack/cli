import { expect } from 'chai';

// eslint-disable-next-line valid-jsdoc
/**
 * ensures that a oclif command or hook exits
 *
 * @param {number} code expected code
 * @default 0
 */
function expectExit(code = 0) {
  return {
  run() {
    expect(process.exitCode).to.equal(code);
    throw new Error(`Expected to exit with code ${code} but it ran without exiting`);
  },
  catch(ctx: { error: unknown }) {
    const err = ctx.error as {
      oclif?: {
        exit?: number;
      };
    };
    if (err.oclif?.exit === undefined) throw ctx.error;
    expect(err.oclif.exit).to.equal(code);
  },
  };
}

export default expectExit;
