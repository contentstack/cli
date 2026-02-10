const path = require('path');
const os = require('os');
const sinon = require('sinon');

// Set test log path to temp directory BEFORE any module loads the logger
process.env.CS_CLI_LOG_PATH = path.join(os.tmpdir(), 'cs-cli-test-logs');
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.CLI_ENV = 'TEST';

const { messageHandler } = require('@contentstack/cli-utilities');

// NOTE init messageHandler
const messageFilePath = path.join(__dirname, '..', '..', 'messages/index.json');
messageHandler.init({ messageFilePath });

// Mock logger to prevent file creation during tests
const mockLogger = {
  debug: sinon.stub(),
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  success: sinon.stub(),
  logError: sinon.stub(),
};

// Stub the logger module to prevent log file creation
const cliUtilities = require('@contentstack/cli-utilities');
if (!cliUtilities.log.debug.restore) {
  sinon.stub(cliUtilities, 'log').value(mockLogger);
}
