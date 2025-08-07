import { expect } from 'chai';
import * as sinon from 'sinon';
import LogoutCommand from '../../../src/commands/auth/logout';
import { cliux } from '@contentstack/cli-utilities';
import { authHandler } from '../../../src/utils';

describe('Logout Command', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(cliux, 'success');
    sandbox.stub(cliux, 'loader');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Logout with valid token, should be successful', async function () {
    const inquireStub = sandbox.stub(cliux, 'inquire');
    await LogoutCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
  });

  it('Logout should prompt for confirmation', async function () {
    const inquireStub = sandbox.stub(cliux, 'inquire').resolves(false);
    const logoutStub = sandbox.stub(authHandler, 'logout');
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