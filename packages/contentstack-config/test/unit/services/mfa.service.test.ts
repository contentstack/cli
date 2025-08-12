import { expect } from 'chai';
import { configHandler, NodeCrypto } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import * as sinon from 'sinon';
import { MFAService } from '../../../src/services/mfa/mfa.service';
import { MFAError } from '../../../src/services/mfa/mfa.types';

describe('MFA Service', () => {
  let mfaService: MFAService;
  let configStub: {
    get: sinon.SinonStub;
    set: sinon.SinonStub;
    delete: sinon.SinonStub;
  };
  let encrypterStub: sinon.SinonStubbedInstance<NodeCrypto>;
  let authenticatorStub: {
    generate: sinon.SinonStub;
    check: sinon.SinonStub;
  };

  beforeEach(() => {
    configStub = {
      get: sinon.stub(configHandler, 'get'),
      set: sinon.stub(configHandler, 'set'),
      delete: sinon.stub(configHandler, 'delete'),
    };
    encrypterStub = sinon.stub(NodeCrypto.prototype);
    authenticatorStub = {
      generate: sinon.stub(authenticator, 'generate'),
      check: sinon.stub(authenticator, 'check'),
    };
    mfaService = new MFAService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validateSecret', () => {
    const validSecrets = [
      'JBSWY3DPEHPK3PXP', // Standard length
      'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', // Double length
      'JBSWY3DPEHPK3PXP====', // With padding
      'AAAAAAAAAAAAAAAA', // Minimum length
    ];

    const invalidSecrets = [
      'invalid!@#', // Invalid characters
      'JBSW', // Too short
      '12345678', // Numbers only
      'abcdefgh', // Lowercase
      'JBSWY3DPEHPK3PXP=', // Invalid padding
      '', // Empty string
      ' JBSWY3DPEHPK3PXP', // Leading space
      'JBSWY3DPEHPK3PXP ', // Trailing space
    ];

    validSecrets.forEach((secret) => {
      it(`should validate secret: ${secret}`, () => {
        authenticatorStub.generate.returns('123456');
        authenticatorStub.check.returns(true);
        expect(mfaService.validateSecret(secret)).to.be.true;
      });
    });

    invalidSecrets.forEach((secret) => {
      it(`should reject invalid secret: ${secret}`, () => {
        expect(mfaService.validateSecret(secret)).to.be.false;
      });
    });
  });

  describe('encryptSecret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = 'encrypted-secret|iv';

    it('should encrypt secret successfully', () => {
      encrypterStub.encrypt.returns(encrypted);
      expect(mfaService.encryptSecret(secret)).to.equal(encrypted);
    });

    it('should handle encryption errors', () => {
      encrypterStub.encrypt.throws(new Error('Encryption failed'));
      try {
        mfaService.encryptSecret('JBSWY3DPEHPK3PXP');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to encrypt secret');
      }
    });

    it('should normalize secret before encryption', () => {
      encrypterStub.encrypt.returns(encrypted);
      mfaService.encryptSecret(secret);
      expect(encrypterStub.encrypt.calledWith(secret.toUpperCase())).to.be.true;
    });
  });

  describe('decryptSecret', () => {
    const encrypted = 'encrypted-secret|iv';
    const decrypted = 'JBSWY3DPEHPK3PXP';

    it('should decrypt secret successfully', () => {
      encrypterStub.decrypt.returns(decrypted);
      expect(mfaService.decryptSecret(encrypted)).to.equal(decrypted);
    });

    it('should handle decryption errors', () => {
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      try {
        mfaService.decryptSecret('encrypted-secret|iv');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to decrypt secret');
      }
    });
  });

  describe('getStoredConfig', () => {
    it('should return null when no config exists', () => {
      configStub.get.returns(null);
      expect(mfaService.getStoredConfig()).to.be.null;
    });

    it('should return null when config has no secret', () => {
      configStub.get.returns({});
      expect(mfaService.getStoredConfig()).to.be.null;
    });

    it('should return config when valid', () => {
      const config = { secret: 'encrypted', last_updated: new Date().toISOString() };
      configStub.get.returns(config);
      expect(mfaService.getStoredConfig()).to.deep.equal(config);
    });

    it('should handle config read errors', () => {
      configStub.get.throws(new Error('Read failed'));
      try {
        mfaService.getStoredConfig();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to read configuration');
      }
    });
  });

  describe('storeConfig', () => {
    const config = { secret: 'encrypted' };

    it('should store config successfully', () => {
      const now = new Date();
      const isoString = now.toISOString();
      const clock = sinon.useFakeTimers(now);

      mfaService.storeConfig(config);
      
      expect(configStub.set.calledOnce).to.be.true;
      expect(configStub.set.firstCall.args[0]).to.equal('mfa');
      expect(configStub.set.firstCall.args[1]).to.deep.equal({
        secret: config.secret,
        last_updated: isoString
      });

      clock.restore();
    });

    it('should handle store errors', () => {
      configStub.set.throws(new Error('Store failed'));
      try {
        mfaService.storeConfig({ secret: 'encrypted' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to store configuration');
      }
    });
  });

  describe('removeConfig', () => {
    it('should remove config successfully', () => {
      mfaService.removeConfig();
      expect(configStub.delete.calledWith('mfa')).to.be.true;
    });

    it('should handle remove errors', () => {
      configStub.delete.throws(new Error('Delete failed'));
      try {
        mfaService.removeConfig();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to remove configuration');
      }
    });
  });

  describe('generateMFA', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = '123456';

    it('should generate MFA code successfully', () => {
      authenticatorStub.generate.returns(code);
      expect(mfaService.generateMFA(secret)).to.equal(code);
    });

    it('should handle generate errors', () => {
      authenticatorStub.generate.throws(new Error('Generate failed'));
      try {
        mfaService.generateMFA('JBSWY3DPEHPK3PXP');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.an('error').with.property('name', 'MFAError');
        expect((error as MFAError).message).to.equal('Failed to generate code');
      }
    });

    it('should normalize secret before generating code', () => {
      authenticatorStub.generate.returns(code);
      mfaService.generateMFA(secret);
      expect(authenticatorStub.generate.calledWith(secret.toUpperCase())).to.be.true;
    });
  });

  describe('verifyMFA', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const token = '123456';

    it('should verify MFA code successfully', () => {
      authenticatorStub.check.returns(true);
      expect(mfaService.verifyMFA(secret, token)).to.be.true;
    });

    it('should return false for invalid code', () => {
      authenticatorStub.check.returns(false);
      expect(mfaService.verifyMFA('JBSWY3DPEHPK3PXP', '123456')).to.be.false;
    });

    it('should handle verify errors gracefully', () => {
      authenticatorStub.check.returns(false);
      expect(mfaService.verifyMFA('JBSWY3DPEHPK3PXP', '123456')).to.be.false;
    });

    it('should normalize secret before verification', () => {
      authenticatorStub.check.returns(true);
      mfaService.verifyMFA(secret, token);
      expect(authenticatorStub.check.calledWith(token, secret.toUpperCase())).to.be.true;
    });
  });
});