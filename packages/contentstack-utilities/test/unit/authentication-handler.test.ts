//@ts-nocheck
import { expect } from 'chai';
import { createSandbox } from 'sinon';
import authenticationHandler from '../../src/authentication-handler';
import configHandler from '../../src/config-handler';
import cliux from '../../src/cli-ux';

describe('Authentication Handler', () => {
  describe('refreshAccessToken - 401 handling', () => {
    let sandbox;
    let printStub;

    beforeEach(() => {
      sandbox = createSandbox();
      printStub = sandbox.stub(cliux, 'print');
    });

    afterEach(() => {
      sandbox.restore();
    });

    const printedMessages = () => printStub.getCalls().map((call) => String(call.args[0]));

    it('should stop after a single refresh when the 401 persists', async () => {
      // Regression guard: the 401 branch used to recurse with the same stale error and an
      // unincremented counter, so a successful refresh that did not clear the 401 looped forever.
      sandbox.stub(configHandler, 'get').returns({ cma: 'https://api.contentstack.io' });
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(true);

      await authenticationHandler.refreshAccessToken({ response: { status: 401 } });

      expect(refreshTokenStub.callCount).to.equal(1);
      expect(printedMessages().some((msg) => msg.includes('Authentication failed after token refresh'))).to.be.true;
    });

    it('should not retry when the token refresh itself fails', async () => {
      sandbox.stub(configHandler, 'get').returns({ cma: 'https://api.contentstack.io' });
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(false);

      await authenticationHandler.refreshAccessToken({ response: { status: 401 } });

      expect(refreshTokenStub.callCount).to.equal(1);
      expect(printedMessages().some((msg) => msg.includes('Authentication failed'))).to.be.true;
    });

    it('should derive the host from a region cma that is not a URL', async () => {
      sandbox.stub(configHandler, 'get').returns({ cma: 'api.contentstack.io' });
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(false);

      await authenticationHandler.refreshAccessToken({ response: { status: 401 } });

      expect(refreshTokenStub.calledOnceWith('api.contentstack.io')).to.be.true;
    });

    it('should not attempt a refresh when no region cma is configured', async () => {
      sandbox.stub(configHandler, 'get').returns({});
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(true);

      await authenticationHandler.refreshAccessToken({ response: { status: 401 } });

      expect(refreshTokenStub.called).to.be.false;
    });

    it('should honour an already-exhausted retry count without refreshing', async () => {
      sandbox.stub(configHandler, 'get').returns({ cma: 'https://api.contentstack.io' });
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(true);

      await authenticationHandler.refreshAccessToken({ response: { status: 401 } }, 2);

      expect(refreshTokenStub.called).to.be.false;
      expect(printedMessages().some((msg) => msg.includes('Authentication failed after token refresh'))).to.be.true;
    });
  });

  describe('refreshAccessToken - other statuses', () => {
    let sandbox;
    let printStub;

    beforeEach(() => {
      sandbox = createSandbox();
      printStub = sandbox.stub(cliux, 'print');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should do nothing when the error carries no response', async () => {
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(true);

      await authenticationHandler.refreshAccessToken(new Error('boom'));

      expect(refreshTokenStub.called).to.be.false;
      expect(printStub.called).to.be.false;
    });

    it('should do nothing for an unhandled status', async () => {
      const refreshTokenStub = sandbox.stub(authenticationHandler, 'refreshToken').resolves(true);

      await authenticationHandler.refreshAccessToken({ response: { status: 500 } });

      expect(refreshTokenStub.called).to.be.false;
      expect(printStub.called).to.be.false;
    });

    it('should still cap 429 retries at three attempts', async () => {
      // The 429/408 branch is untouched by the 401 fix; this guards against regressing it.
      await authenticationHandler.refreshAccessToken({ response: { status: 429 } });

      const messages = printStub.getCalls().map((call) => String(call.args[0]));
      expect(messages.some((msg) => msg.includes('Max retry attempts exceeded (3/3)'))).to.be.true;
    });
  });
});
