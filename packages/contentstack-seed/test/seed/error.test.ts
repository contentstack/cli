import ContentModelSeederError from '../../src/seed/error';

describe('ContentModelSeederError', () => {
  describe('constructor', () => {
    it('should create an error with message and suggestions', () => {
      const message = 'Test error message';
      const suggestions = ['Suggestion 1', 'Suggestion 2'];
      const error = new ContentModelSeederError(message, suggestions);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(message);
      expect(error.suggestions).toEqual(suggestions);
      expect(error.name).toBe('ContentModelSeederError');
    });

    it('should have a stack trace', () => {
      const error = new ContentModelSeederError('Test', []);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should handle empty suggestions array', () => {
      const error = new ContentModelSeederError('Test error', []);
      expect(error.suggestions).toEqual([]);
    });

    it('should handle multiple suggestions', () => {
      const suggestions = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'];
      const error = new ContentModelSeederError('Test', suggestions);
      expect(error.suggestions).toHaveLength(3);
      expect(error.suggestions).toEqual(suggestions);
    });
  });

  describe('error inheritance', () => {
    it('should be an instance of Error', () => {
      const error = new ContentModelSeederError('Test', []);
      expect(error instanceof Error).toBe(true);
    });

    it('should be throwable', () => {
      const error = new ContentModelSeederError('Test', []);
      expect(() => {
        throw error;
      }).toThrow('Test');
    });
  });
});
