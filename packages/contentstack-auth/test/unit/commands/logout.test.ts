import { expect } from 'chai';
import * as sinon from 'sinon';
import LogoutCommand from '../../../src/commands/auth/logout';
import { authHandler } from '../../../src/utils';
import { CLIError, cliux } from '@contentstack/cli-utilities';

const user = { email: '***REMOVED***', authtoken: 'testtoken' };
const validAuthToken = 'bltadjkjdkjfd';

describe('Logout Command', () => {
  let logoutStub;
  let inquireStub;
  let successStub;
  before(function () {
    logoutStub = sinon.stub(authHandler, 'logout').callsFake(function (authToken): Promise<any> {
      if (authToken === validAuthToken) {
        return Promise.resolve({ user });
      }
      return Promise.reject(new CLIError({ message: 'invalid token' }));
    });

    inquireStub = sinon.stub(cliux, 'inquire').resolves(true);
    successStub = sinon.stub(cliux, 'success').resolves();
  });

  after(() => {
    logoutStub.restore();
    inquireStub.restore();
    successStub.restore();
  });

  it('Logout with valid token, should be successful', async function () {
    await LogoutCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
  });

  it('logout with force flag, should not propmt the confirm', async function () {
    const stub1 = sinon.stub(LogoutCommand.prototype, 'run').resolves();
    const args = ['-f'];
    await LogoutCommand.run(args);
    expect(stub1.calledOnce).to.be.true;
    stub1.restore();
  });
});
