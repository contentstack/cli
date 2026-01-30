import GithubError from '../../../src/seed/github/error';

describe('GithubError', () => {
  describe('constructor', () => {
    it('should create an error with message and status', () => {
      const message = 'Test error message';
      const status = 404;
      const error = new GithubError(message, status);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.name).toBe('GithubError');
    });

    it('should handle different status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500];
      statusCodes.forEach((status) => {
        const error = new GithubError('Test', status);
        expect(error.status).toBe(status);
      });
    });

    it('should have a stack trace', () => {
      const error = new GithubError('Test', 500);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('error inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new GithubError('Test', 404);
      expect(error instanceof Error).toBe(true);
    });

    it('should be throwable', () => {
      const error = new GithubError('Test', 500);
      expect(() => {
        throw error;
      }).toThrow('Test');
    });
  });

  describe('status code handling', () => {
    it('should store status code correctly', () => {
      const error = new GithubError('Not found', 404);
      expect(error.status).toBe(404);
    });

    it('should handle rate limit status code', () => {
      const error = new GithubError('Rate limit exceeded', 403);
      expect(error.status).toBe(403);
    });
  });
});
