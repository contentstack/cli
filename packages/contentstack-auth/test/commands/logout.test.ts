import { expect } from 'chai';
import * as sinon from 'sinon';
import { stub } from 'sinon';
import LogoutCommand from '../../src/commands/auth/logout';
import { authHandler, cliux, interactive, CLIError } from '../../src/utils';
import { Command } from '@contentstack/cli-command';

const user = { email: '***REMOVED***', authtoken: 'testtoken' };
const validAuthToken = 'bltadjkjdkjfd';

describe('Logout Command', () => {
  let logoutStub;
  let getAuthTokenStub;
  let managementClientStub;
  before(function () {
    managementClientStub = sinon.stub(LogoutCommand.prototype, 'managementAPIClient').get(() => {});
    logoutStub = sinon.stub(authHandler, 'logout').callsFake(function (authToken): Promise<any> {
      if (authToken === validAuthToken) {
        return Promise.resolve({ user });
      }
      return Promise.reject(new CLIError({ message: 'invalid token' }));
    });
    getAuthTokenStub = sinon.stub(LogoutCommand.prototype, 'authToken').get(function getterFn() {
      return validAuthToken;
    });
  });

  after(() => {
    logoutStub.restore();
    getAuthTokenStub.restore();
    managementClientStub.restore();
  });

  it('Logout with valid token, should be successful', async function () {
    const cliuxStub1 = sinon.stub(cliux, 'inquire').resolves(true);
    const cliuxStub2 = sinon.stub(cliux, 'success').resolves();
    await LogoutCommand.run([]);
    expect(cliuxStub2.calledOnce).to.be.true;
    cliuxStub1.restore();
    cliuxStub2.restore();
  });

  it('logout with force flag, should not propmt the confirm', async function () {
    const cliuxStub1 = sinon.stub(cliux, 'inquire').resolves(true);
    await LogoutCommand.run(['-f']);
    expect(cliuxStub1.calledOnce).to.be.false;
    cliuxStub1.restore();
  });
});
