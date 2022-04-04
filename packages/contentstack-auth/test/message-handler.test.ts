import { expect } from 'chai';
import * as sinon from 'sinon';
import { messageHandler } from '../src/utils';

describe('Message Handler', () => {
  it('parse with valid message key, should resolve to message', function () {
    const message = 'Enter your email address';
    const result = messageHandler.parse('CLI_AUTH_LOGIN_ENTER_EMAIL_ADDRESS');
    expect(result).to.be.equal(message);
  });

  it('parse with invalid message key, returns the key itself', function () {
    const result = messageHandler.parse('CLI_LOGIN_ENTER_EMAIL_ADDRESS');
    expect(result).to.be.equal('CLI_LOGIN_ENTER_EMAIL_ADDRESS');
  });
});
