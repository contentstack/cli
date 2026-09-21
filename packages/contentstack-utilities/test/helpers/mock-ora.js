/**
 * Install the `ora` mock before any test file is loaded.
 *
 * Mocha loads every test file up front, so a `Module.prototype.require` interception set up
 * inside one test file is already too late: an alphabetically earlier file will have pulled
 * `cli-progress-manager` — and with it the real `ora` — into the require cache, and the
 * module-scope binding it captured can no longer be replaced. Intercepting here, from a
 * `--require` entry, is the only point that runs before all of them, which is what makes
 * spinner assertions deterministic whether a file runs alone or as part of the suite.
 */
const sinon = require('sinon');
const Module = require('module');

const mockOraInstance = {
  start: sinon.stub().returnsThis(),
  stop: sinon.stub().returnsThis(),
  succeed: sinon.stub().returnsThis(),
  fail: sinon.stub().returnsThis(),
  warn: sinon.stub().returnsThis(),
  info: sinon.stub().returnsThis(),
  text: '',
  color: 'cyan',
  isSpinning: false,
};

const mockOra = sinon.stub().returns(mockOraInstance);
mockOra.promise = sinon.stub().returns(mockOraInstance);

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'ora') {
    return mockOra;
  }
  return originalRequire.apply(this, arguments);
};

module.exports = { mockOra, mockOraInstance };
