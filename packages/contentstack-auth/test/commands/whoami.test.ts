import { expect } from 'chai';
import * as sinon from 'sinon';
import { stub } from 'sinon';
import WhoamiCommand from '../../src/commands/auth/whoami';
import { cliux } from '../../src/utils';

describe('Whoami Command', () => {
  let getEmailStub;
  before(function () {
    getEmailStub = sinon.stub(WhoamiCommand.prototype, 'email').get(function getterFn() {
      return 'test@contentstack.com';
    });
  });

  after(() => {
    getEmailStub.restore();
  });

  it('Logged in user, displays the username', async function () {
    const getEmailStub = sinon.stub(WhoamiCommand.prototype, 'email').get(function getterFn() {
      return 'test@contentstack.com';
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
    const errorMessageStub = sinon.stub(cliux, 'error').returns();
    await WhoamiCommand.run([]);
    expect(errorMessageStub.calledOnce).to.be.true;
    errorMessageStub.restore();
    getEmailStub.restore();
  });
});
