import GithubError from '../src/seed/github/error';

describe('GitHubError', () => {
  test('should test properties', () => {
    const message = 'some_message';
    const status = 200;

    const error = new GithubError(message, status);

    expect(error.message).toBe(message);
    expect(error.status).toBe(status);
    expect(error.name).toBe(GithubError.name);
  });
});
