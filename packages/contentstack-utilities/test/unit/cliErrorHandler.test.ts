import { expect } from 'chai';
import { fancy } from 'fancy-test';
import CLIErrorHandler from '../../src/logger/cliErrorHandler';
import { ERROR_TYPES } from '../../src/constants/errorTypes';

describe('CLIErrorHandler', () => {
  let errorHandler: CLIErrorHandler;

  beforeEach(() => {
    errorHandler = new CLIErrorHandler(true); // debug mode enabled
  });

  fancy.it('should normalize string error to Error object', () => {
    const error = errorHandler['normalizeToError']('simple error');
    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.equal('simple error');
  });

  fancy.it('should classify a 500 error as SERVER_ERROR', () => {
    const error = new Error('Server failure');
    (error as any).status = 500;
    const type = errorHandler['determineErrorType'](error);
    expect(type).to.equal(ERROR_TYPES.SERVER_ERROR);
  });

  fancy.it('should classify 400 error as API Error (ignores 4XX)', () => {
    const error = new Error('Client error');
    (error as any).status = 404;
    const type = errorHandler['determineErrorType'](error);
    expect(type).to.equal(ERROR_TYPES.API_ERROR);
  });

  fancy.it('should flag error containing sensitive info as hidden', () => {
    const error = new Error('My password is secret');
    const hidden = errorHandler['containsSensitiveInfo'](error);
    expect(hidden).to.equal(true);
  });

  fancy.it('should extract debug payload correctly', () => {
    const error = new Error('API error');
    (error as any).request = {
      method: 'GET',
      url: 'http://api.test/resource',
      headers: { authorization: 'token' },
      data: { q: 'test' },
    };
    (error as any).response = {
      status: 500,
      statusText: 'Internal Server Error',
      data: { error: 'fail' },
    };

    const debugPayload = errorHandler['extractDebugPayload'](error);
    expect(debugPayload.request.method).to.equal('GET');
    expect(debugPayload.response.status).to.equal(500);
    expect(debugPayload.command).to.be.undefined;
  });

  fancy.it('should return full classified error with context', () => {
    const err = new Error('Test error');
    (err as any).status = 502;
    const classified = errorHandler.classifyError(err, {
      operation: 'testOp',
      component: 'testComponent',
    });

    expect(classified.type).to.equal(ERROR_TYPES.SERVER_ERROR);
    expect(classified.message).to.equal('Test error');
    expect(classified.context).to.contain('testOp');
    expect(classified.meta?.email).to.be.undefined;
    expect(classified.hidden).to.be.false;
  });

  fancy.it('normalizeToError should handle object that throws', () => {
    const badInput = {
      get message() {
        throw new Error('fail to access message');
      },
    };

    const result = errorHandler['normalizeToError'](badInput);
    expect(result).to.be.instanceOf(Error);
    expect(result.message).to.include('fail');
  });

  fancy.it('containsSensitiveInfo should return false for clean error', () => {
    const error = new Error('All good');
    const result = errorHandler['containsSensitiveInfo'](error);
    expect(result).to.be.false;
  });

  fancy.it('extractMeta should return full meta', () => {
    const meta = errorHandler['extractMeta']({
      email: 'a@b.com',
      apiKey: '123',
      sessionId: 's1',
      userId: 'u1',
      orgId: 'o1',
    });
    expect(meta).to.deep.equal({
      email: 'a@b.com',
      apiKey: '123',
      sessionId: 's1',
      userId: 'u1',
      orgId: 'o1',
    });
  });

  fancy.it('classifyError handles internal error gracefully', () => {
    const invalidError = {
      get message() {
        throw new Error('trigger normalize fail');
      },
    };

    const result = errorHandler.classifyError(invalidError);
    expect(result.type).to.equal(ERROR_TYPES.NORMALIZATION);
    expect(result.message).to.include('Failed to normalize');
  });
});
