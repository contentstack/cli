import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import errorHelper from '../../../src/utils/error-helper';
import * as migrationLoggerModule from '../../../src/utils/migration-logger';
import * as fsHelperModule from '../../../src/utils/fs-helper';
import * as groupByModule from '../../../src/utils/group-by';

describe('Error Helper', () => {
  const tmpDir = path.join(os.tmpdir(), `error-helper-test-${Date.now()}`);
  const testFile = path.join(tmpDir, 'test-file.js');

  let loggerLogStub: SinonStub;
  let readFileStub: SinonStub;
  let groupByStub: SinonStub;

  before(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    fs.writeFileSync(testFile, 'console.log("test");');
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    restore();
    const mockLogger = {
      log: stub(),
    };
    loggerLogStub = stub(migrationLoggerModule, 'default').returns(mockLogger);
    readFileStub = stub(fsHelperModule, 'readFile').returns('test content');
    groupByStub = stub(groupByModule, 'default').returns({});
  });

  afterEach(() => {
    restore();
  });

  it('should export errorHelper function', () => {
    expect(errorHelper).to.exist;
    expect(errorHelper).to.be.a('function');
  });

  it('should log error when filePath is provided', () => {
    const errors = { message: 'Test error' };
    errorHelper(errors, testFile);

    expect(loggerLogStub.called).to.be.true;
  });

  it('should process errors without filePath', () => {
    const errors = [{ file: testFile, meta: { callsite: { line: 1 } } }];
    groupByStub.returns({ [testFile]: errors });

    errorHelper(errors);

    expect(groupByStub.called).to.be.true;
    expect(readFileStub.called).to.be.true;
  });

  it('should handle errors with request data', () => {
    const errors = {
      request: { data: { key: 'value' } },
      message: 'Error message',
    };
    errorHelper(errors, testFile);

    expect(loggerLogStub.called).to.be.true;
  });
});
