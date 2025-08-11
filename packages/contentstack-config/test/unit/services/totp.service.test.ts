import { expect } from 'chai';
import { configHandler, NodeCrypto } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import * as sinon from 'sinon';
import { TOTPService } from '../../../src/services/totp/totp.service';
import { TOTPError } from '../../../src/services/totp/totp.types';

describe('TOTP Service', () => {
  let totpService: TOTPService;
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
    totpService = new TOTPService();
    configStub = {
      get: sinon.stub(configHandler, 'get'),
      set: sinon.stub(configHandler, 'set'),
      delete: sinon.stub(configHandler, 'delete')
    };
    encrypterStub = sinon.stub(NodeCrypto.prototype);
    authenticatorStub = {
      generate: sinon.stub(authenticator, 'generate'),
      check: sinon.stub(authenticator, 'check')
    };
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

    validSecrets.forEach(secret => {
      it(`should validate correct secret format: ${secret}`, () => {
        authenticatorStub.generate.returns('123456');
        authenticatorStub.check.returns(true);
        expect(totpService.validateSecret(secret)).to.be.true;
      });
    });

    invalidSecrets.forEach(secret => {
      it(`should reject invalid secret format: ${secret}`, () => {
        authenticatorStub.generate.returns('123456');
        authenticatorStub.check.returns(false);
        expect(totpService.validateSecret(secret)).to.be.false;
      });
    });
  });

  describe('encryptSecret', () => {
    it('should encrypt secret successfully', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = 'encrypted-secret|iv';
      encrypterStub.encrypt.returns(encrypted);

      expect(totpService.encryptSecret(secret)).to.equal(encrypted);
      expect(encrypterStub.encrypt.calledWith(secret)).to.be.true;
    });

    it('should handle encryption errors', () => {
      encrypterStub.encrypt.throws(new Error('Encryption failed'));
      let error: unknown;
      try {
        totpService.encryptSecret('JBSWY3DPEHPK3PXP');
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to encrypt TOTP secret');
    });

    it('should normalize secret before encryption', () => {
      const secret = ' jbswy3dpehpk3pxp ';
      encrypterStub.encrypt.returns('encrypted');
      totpService.encryptSecret(secret);
      expect(encrypterStub.encrypt.calledWith('JBSWY3DPEHPK3PXP')).to.be.true;
    });
  });

  describe('decryptSecret', () => {
    it('should decrypt secret successfully', () => {
      const encrypted = 'encrypted-secret|iv';
      const decrypted = 'JBSWY3DPEHPK3PXP';
      encrypterStub.decrypt.returns(decrypted);

      expect(totpService.decryptSecret(encrypted)).to.equal(decrypted);
      expect(encrypterStub.decrypt.calledWith(encrypted)).to.be.true;
    });

    it('should handle decryption errors', () => {
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      let error: unknown;
      try {
        totpService.decryptSecret('encrypted-secret|iv');
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to decrypt TOTP secret');
    });
  });

  describe('getStoredConfig', () => {
    it('should return null when no config exists', () => {
      configStub.get.returns(null);
      expect(totpService.getStoredConfig()).to.be.null;
    });

    it('should return null when config has no secret', () => {
      configStub.get.returns({});
      expect(totpService.getStoredConfig()).to.be.null;
    });

    it('should return config when valid', () => {
      const config = { secret: 'encrypted-secret|iv' };
      configStub.get.returns(config);
      expect(totpService.getStoredConfig()).to.deep.equal(config);
    });

    it('should handle config read errors', () => {
      configStub.get.throws(new Error('Read failed'));
      let error: unknown;
      try {
        totpService.getStoredConfig();
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to read TOTP configuration');
    });
  });

  describe('storeConfig', () => {
    it('should store config successfully', () => {
      const config = { secret: 'encrypted-secret|iv' };
      totpService.storeConfig(config);
      expect(configStub.set.calledWith('totp', config)).to.be.true;
    });

    it('should handle storage errors', () => {
      configStub.set.throws(new Error('Storage failed'));
      let error: unknown;
      try {
        totpService.storeConfig({ secret: 'encrypted' });
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to store TOTP configuration');
    });
  });

  describe('removeConfig', () => {
    it('should remove config successfully', () => {
      totpService.removeConfig();
      expect(configStub.delete.calledWith('totp')).to.be.true;
    });

    it('should handle removal errors', () => {
      configStub.delete.throws(new Error('Removal failed'));
      let error: unknown;
      try {
        totpService.removeConfig();
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to remove TOTP configuration');
    });
  });

  describe('generateTOTP', () => {
    it('should generate TOTP code successfully', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const code = '123456';
      authenticatorStub.generate.returns(code);

      expect(totpService.generateTOTP(secret)).to.equal(code);
      expect(authenticatorStub.generate.calledWith(secret)).to.be.true;
    });

    it('should handle generation errors', () => {
      authenticatorStub.generate.throws(new Error('Generation failed'));
      let error: unknown;
      try {
        totpService.generateTOTP('JBSWY3DPEHPK3PXP');
        expect.fail('Should have thrown an error');
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an('error').with.property('name', 'TOTPError');
      expect((error as TOTPError).message).to.equal('Failed to generate TOTP code');
    });

    it('should normalize secret before generation', () => {
      const secret = ' jbswy3dpehpk3pxp ';
      authenticatorStub.generate.returns('123456');
      totpService.generateTOTP(secret);
      expect(authenticatorStub.generate.calledWith('JBSWY3DPEHPK3PXP')).to.be.true;
    });
  });

  describe('verifyTOTP', () => {
    it('should verify TOTP code successfully', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const token = '123456';
      authenticatorStub.check.returns(true);

      expect(totpService.verifyTOTP(secret, token)).to.be.true;
      expect(authenticatorStub.check.calledWith(token, secret)).to.be.true;
    });

    it('should return false for invalid code', () => {
      authenticatorStub.check.returns(false);
      expect(totpService.verifyTOTP('JBSWY3DPEHPK3PXP', '123456')).to.be.false;
    });

    it('should handle verification errors gracefully', () => {
      authenticatorStub.check.throws(new Error('Verification failed'));
      expect(totpService.verifyTOTP('JBSWY3DPEHPK3PXP', '123456')).to.be.false;
    });

    it('should normalize secret before verification', () => {
      const secret = ' jbswy3dpehpk3pxp ';
      const token = '123456';
      authenticatorStub.check.returns(true);
      totpService.verifyTOTP(secret, token);
      expect(authenticatorStub.check.calledWith(token, 'JBSWY3DPEHPK3PXP')).to.be.true;
    });
  });
});