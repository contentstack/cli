import { expect } from 'chai';
import { authenticator } from 'otplib';
import { configHandler, NodeCrypto } from '@contentstack/cli-utilities';
import * as sinon from 'sinon';
import mfaHandler from '../../src/utils/mfa-handler';

describe('MFAHandler', () => {
  const validSecret = 'JBSWY3DPEHPK3PXP'; // Example valid base32 secret
  const invalidSecret = 'invalid-secret';

  let configStub: sinon.SinonStub;
  let encrypterStub: sinon.SinonStubbedInstance<NodeCrypto>;

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.CONTENTSTACK_MFA_SECRET;

    // Setup stubs
    configStub = sinon.stub(configHandler, 'get');
    encrypterStub = sinon.stub(NodeCrypto.prototype);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('generateMFACode', () => {
    it('should generate valid MFA code from valid secret', () => {
      const code = mfaHandler.generateMFACode(validSecret);
      expect(code).to.match(/^\d{6}$/);
      expect(authenticator.verify({ token: code, secret: validSecret })).to.be.true;
    });

    it.skip('should throw error for invalid secret', () => {
      expect(() => mfaHandler.generateMFACode(invalidSecret)).to.throw();
    });
  });

  describe('getMFACode', () => {
    it('should use MFA secret from environment variable when available', async () => {
      process.env.CONTENTSTACK_MFA_SECRET = validSecret;
      const code = await mfaHandler.getMFACode();
      expect(code).to.match(/^\d{6}$/);
      expect(authenticator.verify({ token: code, secret: validSecret })).to.be.true;
    });

    it.skip('should fallback to stored configuration when environment variable is not set', async () => {
      const encryptedSecret = 'encrypted-secret';
      configStub.returns({ secret: encryptedSecret });
      encrypterStub.decrypt.returns(validSecret);

      const code = await mfaHandler.getMFACode();
      expect(code).to.match(/^\d{6}$/);
      expect(configStub.calledOnce).to.be.true;
      expect(encrypterStub.decrypt.calledWith(encryptedSecret)).to.be.true;
    });

    it('should prioritize environment variable over stored configuration', async () => {
      const envSecret = 'JBSWY3DPEHPK3PXQ'; // Different from stored secret
      process.env.CONTENTSTACK_MFA_SECRET = envSecret;
      
      const code = await mfaHandler.getMFACode();
      expect(code).to.match(/^\d{6}$/);
      expect(authenticator.verify({ token: code, secret: envSecret })).to.be.true;
    });
  });

  describe('isValidMFACode', () => {
    it('should validate correct format MFA codes', () => {
      expect(mfaHandler.isValidMFACode('123456')).to.be.true;
    });

    it('should reject incorrect format MFA codes', () => {
      expect(mfaHandler.isValidMFACode('12345')).to.be.false; // Too short
      expect(mfaHandler.isValidMFACode('1234567')).to.be.false; // Too long
      expect(mfaHandler.isValidMFACode('abcdef')).to.be.false; // Non-numeric
    });
  });
});