import { expect } from 'chai';
import { fancy } from 'fancy-test';
import CLIErrorHandler from '../../src/logger/cli-error-handler';
import { ERROR_TYPES } from '../../src/constants/errorTypes';

describe('CLIErrorHandler', () => {
  let errorHandler: CLIErrorHandler;

  beforeEach(() => {
    errorHandler = new CLIErrorHandler();
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

  fancy.it('should extract error payload correctly', () => {
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
    (error as any).status = 500; // Also set status on error directly

    const errorPayload = errorHandler['extractErrorPayload'](error);
    expect(errorPayload.request.method).to.equal('GET');
    expect(errorPayload.response.status).to.equal(500);
    expect(errorPayload.status).to.equal(500);
    expect(errorPayload.name).to.equal('Error');
    expect(errorPayload.message).to.equal('API error');
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
    expect(classified.meta?.operation).to.equal('testOp');
    expect(classified.meta?.component).to.equal('testComponent');
    expect(classified.meta?.email).to.be.undefined;
    expect(classified.hidden).to.be.false;
  });

  fancy.it('containsSensitiveInfo should return false for clean error', () => {
    const error = new Error('All good');
    const result = errorHandler['containsSensitiveInfo'](error);
    expect(result).to.be.false;
  });

  fancy.it('extractMeta should return full meta', () => {
    const meta = errorHandler['extractMeta']({
      email: 'a@b.com',
      sessionId: 's1',
      userId: 'u1',
      orgId: 'o1',
    }, 'API_ERROR');
    // extractMeta only extracts specific fields: operation, component, userId, sessionId, orgId, email
    // apiKey is not extracted by extractMeta
    expect(meta).to.deep.equal({
      email: 'a@b.com',
      sessionId: 's1',
      userId: 'u1',
      orgId: 'o1',
      errorType: 'API_ERROR',
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
    expect(result.message).to.equal('Failed to process error');
  });
});
