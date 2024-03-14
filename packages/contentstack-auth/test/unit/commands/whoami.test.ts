import { expect } from 'chai';
import * as sinon from 'sinon';
import WhoamiCommand from '../../../src/commands/auth/whoami';
import { cliux } from '@contentstack/cli-utilities';

describe('Whoami Command', () => {
  let getEmailStub;
  before(function () {
    getEmailStub = sinon.stub(WhoamiCommand.prototype, 'email').get(function getterFn() {
      return '***REMOVED***';
    });
  });

  after(() => {
    getEmailStub.restore();
  });

  it('Logged in user, displays the username', async function () {
    const getEmailStub = sinon.stub(WhoamiCommand.prototype, 'email').get(function getterFn() {
      return '***REMOVED***';
    });
    const successMessageStub = sinon.stub(cliux, 'print').returns();
    await WhoamiCommand.run([]);
    expect(successMessageStub.calledTwice).to.be.true;
    getEmailStub.restore();
    successMessageStub.restore();
  });
  it('Logged out user, should throw an error', async function () {
    const getEmailStub = sinon.stub(WhoamiCommand.prototype, 'email').get(function getterFn() {
      throw new Error('No logged in');
    });
    const printStub = sinon.stub(cliux, 'print');
    await WhoamiCommand.run([]);

    expect(printStub.calledWith('CLI_AUTH_WHOAMI_FAILED', { color: 'yellow' })).to.be.true;
    getEmailStub.restore();
  });
});
