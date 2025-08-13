import { expect } from 'chai';
import * as sinon from 'sinon';
import LoginCommand from '../../../src/commands/auth/login';
import { authHandler, interactive, mfaHandler } from '../../../src/utils';
import { 
  configHandler, 
  cliux, 
  messageHandler,
  authHandler as oauthHandler
} from '@contentstack/cli-utilities';
import * as managementSDK from '@contentstack/cli-utilities';
// @ts-ignore
import * as conf from '../../config.json';

const config = configHandler;

const user = { email: '***REMOVED***', authtoken: 'testtoken' };
const credentials = { email: '***REMOVED***', password: conf.password };
const invalidCredentials = { email: '***REMOVED***', password: conf.invalidPassowrd };
const TFATestToken = '24563992';

describe('Login Command', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(function () {
    // Restore any existing stubs
    sinon.restore();
    
    sandbox = sinon.createSandbox();
    
    // Setup config handler stubs
    sandbox.stub(config, 'get').returns(credentials.email);
    sandbox.stub(config, 'set').resolves();

    // Setup CLI stubs
    sandbox.stub(cliux, 'success').returns();
    sandbox.stub(cliux, 'error').returns();
    sandbox.stub(cliux, 'print').returns();

    // Setup host property
    sandbox.stub(LoginCommand.prototype, 'cmaHost').value('https://api.contentstack.io');
    // Setup auth handler stub
    sandbox.stub(authHandler, 'login').callsFake(async function (email, password, tfaToken): Promise<any> {
      if (password === credentials.password) {
        return user;
      }
      throw new Error('invalid credentials');
    });

    // Setup management SDK client stub
    const mockClient = {
      login: sandbox.stub().resolves({ user: { email: credentials.email, authtoken: 'test-token' } }),
      logout: sandbox.stub().resolves({}),
      getUser: sandbox.stub().resolves({ email: credentials.email })
    };
    sandbox.stub(managementSDK, 'managementSDKClient').resolves(mockClient);
    authHandler.client = mockClient;

    // Setup MFA handler stub
    sandbox.stub(mfaHandler, 'getMFACode').resolves(TFATestToken);

    // Setup OAuth handler stub
    sandbox.stub(oauthHandler, 'setConfigData').resolves();

    // Setup message handler stub
    sandbox.stub(messageHandler, 'parse').returns('Successfully logged in!!');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Login with valid credentials, should be successful', async function () {
    await LoginCommand.run(['-u', credentials.email, '-p', credentials.password]);
    expect(config.get('email')).to.be.equal(credentials.email);
  });

  it('Login with with only email, should prompt for password', async function () {
    const askPasswordStub = sandbox.stub(interactive, 'askPassword').resolves(credentials.password);
    await LoginCommand.run(['-u', credentials.email]);
    expect(askPasswordStub.calledOnce).to.be.true;
  });

  it('Login with no flags, should prompt for credentials', async function () {
    const askPasswordStub = sandbox.stub(interactive, 'askPassword').resolves(credentials.password);
    const askEmailStub = sandbox.stub(cliux, 'inquire').resolves(credentials.email);
    await LoginCommand.run([]);
    expect(askPasswordStub.calledOnce).to.be.true;
    expect(askEmailStub.calledOnce).to.be.true;
  });
});
