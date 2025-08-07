import { expect } from 'chai';
import * as sinon from 'sinon';
import { totpHandler } from '../../../src/utils';
import { authenticator } from 'otplib';
import { configHandler } from '@contentstack/cli-utilities';

describe('TOTP Handler', () => {
  const validSecret = 'JBSWY3DPEHPK3PXP'; // Example Base32 secret
  const invalidSecret = 'INVALID123'; // Invalid Base32 secret

  describe('generateTOTPFromSecret', () => {
    it('should generate valid TOTP code from valid secret', () => {
      const code = totpHandler.generateTOTPFromSecret(validSecret);
      expect(code).to.match(/^\d{6}$/);
      expect(authenticator.verify({ token: code, secret: validSecret })).to.be.true;
    });

    it('should throw error for invalid secret', () => {
      expect(() => totpHandler.generateTOTPFromSecret(invalidSecret)).to.throw('Failed to generate TOTP code from provided secret');
    });

    it('should normalize secret to uppercase', () => {
      const lowerSecret = validSecret.toLowerCase();
      const code = totpHandler.generateTOTPFromSecret(lowerSecret);
      expect(code).to.match(/^\d{6}$/);
      expect(authenticator.verify({ token: code, secret: validSecret })).to.be.true;
    });
  });

  describe('getTOTPCode', () => {
    let configGetStub: sinon.SinonStub;
    let decryptStub: sinon.SinonStub;

    beforeEach(() => {
      configGetStub = sinon.stub(configHandler, 'get');
      decryptStub = sinon.stub();
      // @ts-ignore - accessing private property for testing
      totpHandler.encrypter = { decrypt: decryptStub };
    });

    afterEach(() => {
      configGetStub.restore();
      sinon.restore();
    });

    it('should use stored configuration if available', async () => {
      configGetStub.returns({ secret: 'encrypted-secret' });
      decryptStub.returns(validSecret);
      const generateSpy = sinon.spy(totpHandler, 'generateTOTPFromSecret');

      const code = await totpHandler.getTOTPCode();
      
      expect(code).to.match(/^\d{6}$/);
      expect(generateSpy.calledOnce).to.be.true;
      expect(generateSpy.calledWith(validSecret)).to.be.true;
    });

    it('should fall back to manual input if no configuration available', async () => {
      configGetStub.returns(null);
      const manualCode = '123456';
      const askOTPStub = sinon.stub(totpHandler, 'getManualTOTPCode').resolves(manualCode);

      const code = await totpHandler.getTOTPCode();
      
      expect(code).to.equal(manualCode);
      expect(askOTPStub.calledOnce).to.be.true;
    });

    it('should throw error if stored secret decryption fails', async () => {
      configGetStub.returns({ secret: 'encrypted-secret' });
      decryptStub.throws(new Error('Decryption failed'));

      try {
        await totpHandler.getTOTPCode();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('message', 'Failed to decrypt stored TOTP secret');
      }
    });
  });

  describe('handleTOTPAuth', () => {
    it('should use getTOTPCode for authentication', async () => {
      const expectedCode = '123456';
      const getTOTPCodeStub = sinon.stub(totpHandler, 'getTOTPCode').resolves(expectedCode);

      const code = await totpHandler.handleTOTPAuth();
      
      expect(code).to.equal(expectedCode);
      expect(getTOTPCodeStub.calledOnce).to.be.true;
      getTOTPCodeStub.restore();
    });

    it('should fall back to manual input on error', async () => {
      const expectedCode = '123456';
      const getTOTPCodeStub = sinon.stub(totpHandler, 'getTOTPCode').rejects(new Error('Failed'));
      const getManualCodeStub = sinon.stub(totpHandler, 'getManualTOTPCode').resolves(expectedCode);

      const code = await totpHandler.handleTOTPAuth();
      
      expect(code).to.equal(expectedCode);
      expect(getTOTPCodeStub.calledOnce).to.be.true;
      expect(getManualCodeStub.calledOnce).to.be.true;
      getTOTPCodeStub.restore();
      getManualCodeStub.restore();
    });
  });
});