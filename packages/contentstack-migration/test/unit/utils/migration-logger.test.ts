import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import MigrationLogger from '../../../src/utils/migration-logger';

describe('Migration Logger', () => {
  const tmpDir = path.join(os.tmpdir(), `migration-logger-test-${Date.now()}`);

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

  it('should create MigrationLogger instance', () => {
    const logger = new MigrationLogger(tmpDir);
    expect(logger).to.be.instanceOf(MigrationLogger);
    expect(logger.filePath).to.include('migration-logs');
    expect(logger.logger).to.exist;
  });

  it('should have log method', () => {
    const logger = new MigrationLogger(tmpDir);
    expect(logger.log).to.be.a('function');
  });

  it('should call logger.log when log method is called', () => {
    const logger = new MigrationLogger(tmpDir);
    const logSpy = require('sinon').spy(logger.logger, 'log');
    
    logger.log('error', 'Test message');
    
    expect(logSpy.called).to.be.true;
    logSpy.restore();
  });

  it('should have filePath property', () => {
    const logger = new MigrationLogger(tmpDir);
    expect(logger.filePath).to.exist;
    expect(logger.filePath).to.include('migration-logs');
  });
});
