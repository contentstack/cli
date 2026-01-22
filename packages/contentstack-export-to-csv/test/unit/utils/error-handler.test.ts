import { expect } from 'chai';
import sinon from 'sinon';
import {
  formatError,
  wait,
} from '../../../dist/utils/error-handler';

describe('error-handler', () => {
  describe('formatError', () => {
    it('should handle string errors', () => {
      const result = formatError('Simple error message');
      expect(result).to.equal('Simple error message');
    });

    it('should handle JSON string errors', () => {
      const jsonError = JSON.stringify({ errorMessage: 'JSON error' });
      const result = formatError(jsonError);
      expect(result).to.equal('JSON error');
    });

    it('should handle error objects with errorMessage', () => {
      const error = { errorMessage: 'Error message from API' };
      const result = formatError(error);
      expect(result).to.equal('Error message from API');
    });

    it('should handle error objects with error_message', () => {
      const error = { error_message: 'Error message with underscore' };
      const result = formatError(error);
      expect(result).to.equal('Error message with underscore');
    });

    it('should handle error objects with message', () => {
      const error = { message: 'Standard error message' };
      const result = formatError(error);
      expect(result).to.equal('Standard error message');
    });

    it('should handle Error objects with JSON message', () => {
      const error = new Error(JSON.stringify({ errorMessage: 'Nested JSON error' }));
      const result = formatError(error);
      expect(result).to.equal('Nested JSON error');
    });

    it('should handle Error objects with plain message', () => {
      const error = new Error('Plain error message');
      const result = formatError(error);
      expect(result).to.equal('Plain error message');
    });

    it('should append authorization error details', () => {
      const error = {
        errorMessage: 'Unauthorized',
        errors: { authorization: 'is invalid' },
      };
      const result = formatError(error);
      expect(result).to.include('Management Token');
      expect(result).to.include('is invalid');
    });

    it('should append api_key error details', () => {
      const error = {
        errorMessage: 'Invalid request',
        errors: { api_key: 'is required' },
      };
      const result = formatError(error);
      expect(result).to.include('Stack API key');
      expect(result).to.include('is required');
    });

    it('should append uid error details', () => {
      const error = {
        errorMessage: 'Not found',
        errors: { uid: 'does not exist' },
      };
      const result = formatError(error);
      expect(result).to.include('Content Type');
      expect(result).to.include('does not exist');
    });

    it('should append access_token error details', () => {
      const error = {
        errorMessage: 'Unauthorized',
        errors: { access_token: 'is expired' },
      };
      const result = formatError(error);
      expect(result).to.include('Delivery Token');
      expect(result).to.include('is expired');
    });

    it('should handle multiple error fields', () => {
      const error = {
        errorMessage: 'Multiple errors',
        errors: {
          authorization: 'is invalid',
          api_key: 'is missing',
        },
      };
      const result = formatError(error);
      expect(result).to.include('Management Token');
      expect(result).to.include('Stack API key');
    });

    it('should handle unknown error fields', () => {
      const error = {
        errorMessage: 'Unknown error',
        errors: { custom_field: 'has issue' },
      };
      const result = formatError(error);
      expect(result).to.include('custom_field');
      expect(result).to.include('has issue');
    });

    it('should handle null error', () => {
      const result = formatError(null);
      expect(result).to.equal('null');
    });

    it('should handle undefined error', () => {
      const result = formatError(undefined);
      expect(result).to.equal('undefined');
    });

    it('should handle empty object', () => {
      const result = formatError({});
      expect(result).to.be.a('string');
    });
  });

  describe('wait', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('should resolve after specified time', async () => {
      let resolved = false;
      const waitPromise = wait(1000).then(() => {
        resolved = true;
      });

      expect(resolved).to.be.false;

      clock.tick(999);
      await Promise.resolve(); // Allow microtasks to run
      expect(resolved).to.be.false;

      clock.tick(1);
      await waitPromise;
      expect(resolved).to.be.true;
    });

    it('should resolve immediately for 0ms', async () => {
      let resolved = false;
      const waitPromise = wait(0).then(() => {
        resolved = true;
      });

      clock.tick(0);
      await waitPromise;
      expect(resolved).to.be.true;
    });
  });

  // Note: handleErrorMsg, handleTaxonomyErrorMsg, and exitProgram call process.exit()
  // Testing these would require stubbing process.exit which can be complex.
  // For coverage purposes, we test formatError and wait which cover most logic.
});
