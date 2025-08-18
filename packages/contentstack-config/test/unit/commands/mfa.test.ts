import { expect } from 'chai';
import { configHandler, cliux, NodeCrypto } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import * as sinon from 'sinon';
import MFAAddCommand from '../../../src/commands/config/mfa/add';

describe('MFA Commands', function () {
  let inquireStub: sinon.SinonStub;
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

  beforeEach(function () {
    inquireStub = sinon.stub(cliux, 'inquire');
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

  afterEach(function () {
    sinon.restore();
  });

  describe('config:mfa:add', function () {
    const validSecret = 'JBSWY3DPEHPK3PXP'; // Example valid Base32 secret
    const encryptedSecret = 'encrypted-secret|iv';
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

    let processExitStub: sinon.SinonStub;

    beforeEach(function() {
      processExitStub = sinon.stub(process, 'exit');
    });

    it('should use MFA secret from environment variable', async function () {
      process.env.CONTENTSTACK_MFA_SECRET = validSecret;
      configStub.get.returns(null);
      authenticatorStub.generate.returns('123456');
      authenticatorStub.check.returns(true);

      await MFAAddCommand.run([]);
      expect(configStub.set.called).to.be.false;
      delete process.env.CONTENTSTACK_MFA_SECRET;
    });

    it('should exit with code 1 for invalid environment variable secret', async function () {
      process.env.CONTENTSTACK_MFA_SECRET = 'invalid-secret';
      configStub.get.returns(null);
      authenticatorStub.check.returns(false);

      await MFAAddCommand.run([]);
      expect(processExitStub.calledWith(1)).to.be.true;
      delete process.env.CONTENTSTACK_MFA_SECRET;
    });

    it('should add MFA configuration successfully with manual input', async function () {
      configStub.get.returns(null);
      encrypterStub.encrypt.returns(encryptedSecret);
      authenticatorStub.generate.returns('123456');
      authenticatorStub.check.returns(true);
      inquireStub.returns(Promise.resolve(validSecret));

      await MFAAddCommand.run([]);
      expect(configStub.set.calledOnce).to.be.true;
      expect(configStub.set.firstCall.args[0]).to.equal('mfa');
    });

    it('should cancel when user declines to overwrite existing config', async function () {
      configStub.get.returns({ secret: 'existing-secret' });
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns('123456');

      // First prompt for secret
      inquireStub.onFirstCall().returns(Promise.resolve(validSecret));
      // Second prompt for confirmation
      inquireStub.onSecondCall().returns(Promise.resolve(false));

      await MFAAddCommand.run([]);
      expect(configStub.set.called).to.be.false;
      expect(inquireStub.calledTwice).to.be.true;
    });

    it('should exit with code 1 for invalid secret format', async function () {
      inquireStub.returns(Promise.resolve('invalid!@#'));
      await MFAAddCommand.run([]);
      expect(processExitStub.calledWith(1)).to.be.true;
    });

    it('should fail when secret cannot generate valid codes', async function () {
      authenticatorStub.check.returns(false);
      try {
        inquireStub.returns(Promise.resolve(validSecret));
      await MFAAddCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.be.not.empty;
      }
    });

    validSecrets.forEach((secret) => {
      it(`should accept valid secret format: ${secret}`, async function () {
        configStub.get.returns(null);
        authenticatorStub.check.returns(true);
        authenticatorStub.generate.returns('123456');
        encrypterStub.encrypt.returns(encryptedSecret);

        inquireStub.returns(Promise.resolve(secret));
        await MFAAddCommand.run([]);
        expect(configStub.set.calledOnce).to.be.true;
      });
    });

    // Test all invalid secret formats
    invalidSecrets.forEach((secret) => {
      it(`should reject invalid secret format: ${secret}`, async function () {
        try {
          inquireStub.returns(Promise.resolve(secret));
        await MFAAddCommand.run([]);
          expect.fail('Should have thrown an error');
        } catch (error: unknown) {
          const err = error as Error;
          expect(err.message).to.be.not.empty;;
        }
      });
    });

    it('should handle missing secret flag', async function () {
      try {
        await MFAAddCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.be.not.empty;
      }
    });

    it('should handle empty secret value', async function () {
      try {
        inquireStub.returns(Promise.resolve(''));
        await MFAAddCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.be.not.empty;
      }
    });

    it('should verify generated code matches authenticator output', async function () {
      configStub.get.returns(null);
      const testCode = '123456';
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns(testCode);
      encrypterStub.encrypt.returns(encryptedSecret);

      inquireStub.returns(Promise.resolve(validSecret));
      await MFAAddCommand.run([]);
      expect(authenticatorStub.generate.calledWith(validSecret)).to.be.true;
      expect(configStub.set.calledOnce).to.be.true;
    });

    it('should handle decryption failure when overwriting existing config', async function () {
      configStub.get.returns({ secret: 'existing-encrypted-secret' });
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns('123456');
      inquireStub.returns(Promise.resolve(true));

      inquireStub.returns(Promise.resolve(validSecret));
      await MFAAddCommand.run([]);
      expect(configStub.set.calledOnce).to.be.true;
    });
  });
});