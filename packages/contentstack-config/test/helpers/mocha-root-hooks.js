/**
 * @contentstack/cli-utilities uses lazy-loaded Chalk 5; preload before tests that hit cliux.success etc.
 */
const { loadChalk } = require('@contentstack/cli-utilities');

exports.mochaHooks = {
  beforeAll() {
    this.timeout(30_000);
    return loadChalk();
  },
};
