import { expect } from 'chai';
import * as sinon from 'sinon';
import LoginCommand from '../../../src/commands/auth/login';
import { authHandler, interactive } from '../../../src/utils';
import { configHandler, cliux } from '@contentstack/cli-utilities';
import * as conf from '../../config.json';

const config = configHandler;

const user = { email: '***REMOVED***', authtoken: 'testtoken' };
const credentials = { email: '***REMOVED***', password: conf.password };
const invalidCredentials = { email: '***REMOVED***', password: conf.invalidPassowrd };
const TFATestToken = '24563992';

describe('Login Command', () => {
  let loginStub;

  before(function () {
    loginStub = sinon.stub(authHandler, 'login').callsFake(function (email, password, tfaToken): Promise<any> {
      if (password === credentials.password) {
        return Promise.resolve(user);
      }
      return Promise.reject({ message: 'invalid credentials' });
    });
  });

  after(() => {
    loginStub.restore();
  });

  it('Login with valid credentials, should be successful', async function () {
    const cliuxStub1 = sinon.stub(cliux, 'success').returns();
    await LoginCommand.run(['-u', credentials.email, '-p', credentials.password]);
    expect(cliuxStub1.calledOnce).to.be.true;
    expect(config.get('email')).to.be.equal(credentials.email);
    cliuxStub1.restore();
  });

  it('Login with with only email, should prompt for password', async function () {
    const askPasswordStub = sinon.stub(interactive, 'askPassword').resolves(credentials.password);
    await LoginCommand.run(['-u', credentials.email]);
    expect(askPasswordStub.calledOnce).to.be.true;
    askPasswordStub.restore();
  });

  it('Login with no flags, should prompt for credentials', async function () {
    const askPasswordStub = sinon.stub(interactive, 'askPassword').resolves(credentials.password);
    const askEmailStub = sinon.stub(cliux, 'inquire').resolves(credentials.email);
    await LoginCommand.run([]);
    expect(askPasswordStub.calledOnce).to.be.true;
    expect(askEmailStub.calledOnce).to.be.true;
    askPasswordStub.restore();
    askEmailStub.restore();
  });
});
