import ContentstackError from '../src/seed/contentstack/error';

describe('ContentstackError', () => {
  test('should test properties', () => {
    const message = 'some_message';
    const status = 200;

    const error = new ContentstackError(message, status);

    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
    expect(error.name).toBe(ContentstackError.name);
  });
});
