import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as loggerModule from '../../../src/utils/logger';
import * as fsHelperModule from '../../../src/utils/fs-helper';

describe('Logger', () => {
  const tmpDir = path.join(os.tmpdir(), `logger-test-${Date.now()}`);
  let makeDirStub: SinonStub;

  before(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    restore();
    makeDirStub = stub(fsHelperModule, 'makeDir');
    process.env.CS_CLI_LOG_PATH = tmpDir;
  });

  afterEach(() => {
    restore();
    delete process.env.CS_CLI_LOG_PATH;
  });

  it('should export logger functions', () => {
    expect(loggerModule).to.exist;
    expect(loggerModule).to.be.an('object');
  });

  it('should export init function', () => {
    expect(loggerModule.init).to.exist;
    expect(loggerModule.init).to.be.a('function');
  });

  it('should initialize logger with log file', () => {
    const logger = loggerModule.init('test-log');
    expect(logger).to.exist;
    expect(logger).to.have.property('log');
    expect(logger).to.have.property('warn');
    expect(makeDirStub.called).to.be.true;
  });

  it('should have log method that accepts arguments', () => {
    const logger = loggerModule.init('test-log');
    expect(() => logger.log('test message')).to.not.throw();
  });

  it('should have warn method', () => {
    const logger = loggerModule.init('test-log');
    expect(() => logger.warn('warn message')).to.not.throw();
  });
});
