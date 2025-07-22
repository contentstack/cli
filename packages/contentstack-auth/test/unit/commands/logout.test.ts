import { expect } from 'chai';
import * as sinon from 'sinon';
import LogoutCommand from '../../../src/commands/auth/logout';
import { cliux } from '@contentstack/cli-utilities';
import { authHandler } from '../../../src/utils';

describe('Logout Command', () => {
  let inquireStub: sinon.SinonStub;
  let successStub: sinon.SinonStub;
  let loaderStub: sinon.SinonStub;
  let logoutStub: sinon.SinonStub;
  let isAuthenticatedStub: sinon.SinonStub;
  let configStub: sinon.SinonStub;

  beforeEach(() => {
    inquireStub = sinon.stub(cliux, 'inquire');
    successStub = sinon.stub(cliux, 'success');
    loaderStub = sinon.stub(cliux, 'loader');
    logoutStub = sinon.stub(authHandler, 'logout').resolves({ user: {} });
  });

  afterEach(() => {
    inquireStub.restore();
    successStub.restore();
    loaderStub.restore();
    logoutStub.restore();
  });

  it('Logout with valid token, should be successful', async function () {
    await LogoutCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
  });

  it('Logout should prompt for confirmation', async function () {
    inquireStub.resolves(false);
    await LogoutCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
    expect(inquireStub.firstCall.args[0]).to.deep.include({
      type: 'confirm',
      message: 'CLI_AUTH_LOGOUT_CONFIRM',
      name: 'confirmation'
    });
    expect(logoutStub.called).to.be.false; // Should not call logout if confirmation is denied
  });
});