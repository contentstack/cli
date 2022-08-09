const { expect } = require("chai");

/**
 * ensures that a oclif command or hook exits
 *
 * @param {number} code expected code
 * @default 0
 */
exports.default = (code = 0) => ({
  run() {
    expect(process.exitCode).to.equal(code);
    throw new Error(`Expected to exit with code ${code} but it ran without exiting`);
  },
  catch(ctx) {
    if (!ctx.error.oclif || ctx.error.oclif.exit === undefined) {
      throw ctx.error;
    }

    expect(ctx.error.oclif.exit).to.equal(code);
  }
})
