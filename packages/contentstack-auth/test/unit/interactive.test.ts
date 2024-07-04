import { expect } from 'chai';
import * as sinon from 'sinon';
import { interactive } from '../../src/utils';
import { cliux } from '@contentstack/cli-utilities';
import * as config from '../config.json'

describe('Interactive', () => {
  let inquireStub;
  beforeEach(function () {
    inquireStub = sinon.stub(cliux, 'inquire');
  });
  afterEach(function () {
    inquireStub.restore();
  });

  it('ask otp channel', async function () {
    const channel = 'authy';
    inquireStub.callsFake(function () {
      return Promise.resolve(channel);
    });
    const result = await interactive.askOTPChannel();
    expect(result).to.be.equal(channel);
  });

  it('ask otp', async function () {
    const otp = '22222';
    inquireStub.callsFake(function () {
      return Promise.resolve(otp);
    });
    const result = await interactive.askOTP();
    expect(result).to.be.equal(otp);
  });

  it('ask password', async function () {
    const password = config.password
    inquireStub.callsFake(function () {
      return Promise.resolve(password);
    });
    const result = await interactive.askPassword();
    expect(result).to.be.equal(password);
  });
});
