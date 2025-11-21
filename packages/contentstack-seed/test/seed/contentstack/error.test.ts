import ContentstackError from '../../../src/seed/contentstack/error';

describe('ContentstackError', () => {
  describe('constructor', () => {
    it('should create an error with message and status', () => {
      const message = 'Test error message';
      const status = 404;
      const error = new ContentstackError(message, status);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.status).toBe(status);
      expect(error.name).toBe('ContentstackError');
    });

    it('should handle different status codes', () => {
      const statusCodes = [400, 401, 403, 404, 500];
      statusCodes.forEach((status) => {
        const error = new ContentstackError('Test', status);
        expect(error.status).toBe(status);
      });
    });

    it('should have a stack trace', () => {
      const error = new ContentstackError('Test', 500);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('error inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new ContentstackError('Test', 404);
      expect(error instanceof Error).toBe(true);
    });

    it('should be throwable', () => {
      const error = new ContentstackError('Test', 500);
      expect(() => {
        throw error;
      }).toThrow('Test');
    });
  });

  describe('status code handling', () => {
    it('should store status code correctly', () => {
      const error = new ContentstackError('Not found', 404);
      expect(error.status).toBe(404);
    });

    it('should handle zero status code', () => {
      const error = new ContentstackError('Test', 0);
      expect(error.status).toBe(0);
    });
  });
});
