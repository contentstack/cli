/**
 * Chalk 5 is ESM-only and loaded asynchronously; production code calls loadChalk() at CLI init.
 * Tests must preload chalk before any getChalk() usage.
 */
const { loadChalk } = require('../../src/chalk');

exports.mochaHooks = {
  beforeAll() {
    this.timeout(30_000);
    return loadChalk();
  },
};
