import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import * as nock from 'nock';
import validateAuthToken from '../../src/hooks/prerun/validate-auth-token';

const config = configHandler
describe('Validate auth token hook', function () {
  let context, exitStub;
  before(function () {
    config.set('authtoken', 'testtoken');
    config.set('region', { name: 'NA', cda: 'https://cda.contentack.com', cma: 'https://cma.contentstack.com' });
    exitStub = sinon.stub().callsFake(function () {});
    context = {
      exit: exitStub,
    };
  });
  after(function () {
    // exitStub.restore();
  });

  it('validate logged in user, should not throw exception', async function () {
    nock('https://cma.contentstack.com').get('/v3/user').reply(200);
    await validateAuthToken.call(context, { Command: { id: 'cm:bootstrap' } });
    expect(exitStub.calledOnce).to.be.false;
  });
  it('User logged out and run the command, should fail to execute', async function () {
    nock('https://cma.contentstack.com').get('/v3/user').reply(401);
    await validateAuthToken.call(context, { Command: { id: 'cm:bootstrap' } });
    expect(exitStub.calledOnce).to.be.true;
  });
  it('Unprotected commands, should not validate', async function () {
    const getUserNock = nock('https://cma.contentstack.com').get('/v3/user').reply(401);
    await validateAuthToken.call(context, { Command: { id: 'cm:test' } });
    expect(getUserNock.isDone()).to.be.false;
  });
});
