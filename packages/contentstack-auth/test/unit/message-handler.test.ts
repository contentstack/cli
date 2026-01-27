import { expect } from 'chai';
import * as cliUtilities from '@contentstack/cli-utilities';
const { messageHandler } = cliUtilities;

describe('Message Handler', () => {
  it('parse with invalid message key, returns the key itself', function () {
    const result = messageHandler.parse('CLI_LOGIN_ENTER_EMAIL_ADDRESS');
    expect(result).to.be.equal('CLI_LOGIN_ENTER_EMAIL_ADDRESS');
  });
});
