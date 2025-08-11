import { expect } from 'chai';
import { configHandler, cliux, NodeCrypto } from '@contentstack/cli-utilities';
import { authenticator } from 'otplib';
import * as sinon from 'sinon';
import TotpAddCommand from '../../../src/commands/config/totp/add';
import TotpRemoveCommand from '../../../src/commands/config/totp/remove';

describe('TOTP Commands', function () {
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

  describe('config:totp:add', function () {
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

    it('should add TOTP configuration successfully with last_updated', async function () {
      configStub.get.returns(null);
      encrypterStub.encrypt.returns(encryptedSecret);
      authenticatorStub.generate.returns('123456');
      authenticatorStub.check.returns(true);
      inquireStub.returns(Promise.resolve(true));

      const now = new Date();
      const clock = sinon.useFakeTimers(now.getTime());

      await TotpAddCommand.run(['--secret', validSecret]);
      expect(configStub.set.calledOnce).to.be.true;
      expect(configStub.set.firstCall.args[0]).to.equal('totp');
      const storedConfig = configStub.set.firstCall.args[1];
      expect(storedConfig).to.have.property('secret', encryptedSecret);
      expect(storedConfig).to.have.property('last_updated');
      expect(new Date(storedConfig.last_updated).getTime()).to.equal(now.getTime());

      clock.restore();
    });

    it('should cancel when user declines to overwrite existing config', async function () {
      const existingConfig = {
        secret: 'existing-secret',
        last_updated: new Date().toISOString()
      };
      configStub.get.returns(existingConfig);
      inquireStub.returns(Promise.resolve(false));
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns('123456');

      await TotpAddCommand.run(['--secret', validSecret]);
      expect(configStub.set.called).to.be.false;
      expect(inquireStub.calledOnce).to.be.true;
    });

    it('should fail with invalid secret format', async function () {
      try {
        await TotpAddCommand.run(['--secret', 'invalid!@#']);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Invalid TOTP secret format');
      }
    });

    it('should fail when secret cannot generate valid codes', async function () {
      authenticatorStub.check.returns(false);
      try {
        await TotpAddCommand.run(['--secret', validSecret]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Invalid TOTP secret format');
      }
    });

    it('should fail when encryption fails', async function () {
      configStub.get.returns(null);
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns('123456');
      encrypterStub.encrypt.throws(new Error('Encryption failed'));

      try {
        await TotpAddCommand.run(['--secret', validSecret]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to store configuration');
      }
    });

    // Test all valid secret formats
    validSecrets.forEach((secret) => {
      it(`should accept valid secret format: ${secret}`, async function () {
        configStub.get.returns(null);
        authenticatorStub.check.returns(true);
        authenticatorStub.generate.returns('123456');
        encrypterStub.encrypt.returns(encryptedSecret);

        await TotpAddCommand.run(['--secret', secret]);
        expect(configStub.set.calledOnce).to.be.true;
      });
    });

    // Test all invalid secret formats
    invalidSecrets.forEach((secret) => {
      it(`should reject invalid secret format: ${secret}`, async function () {
        try {
          await TotpAddCommand.run(['--secret', secret]);
          expect.fail('Should have thrown an error');
        } catch (error: unknown) {
        const err = error as Error;
          expect(err.message).to.contain('Invalid TOTP secret format');
        }
      });
    });

    it('should handle missing secret flag', async function () {
      try {
        await TotpAddCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Invalid TOTP secret format');
      }
    });

    it('should handle empty secret value', async function () {
      try {
        await TotpAddCommand.run(['--secret', '']);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Invalid TOTP secret format');
      }
    });

    it('should verify generated code matches authenticator output', async function () {
      configStub.get.returns(null);
      const testCode = '123456';
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns(testCode);
      encrypterStub.encrypt.returns(encryptedSecret);

      await TotpAddCommand.run(['--secret', validSecret]);
      expect(authenticatorStub.generate.calledWith(validSecret)).to.be.true;
      expect(configStub.set.calledOnce).to.be.true;
    });

    it('should handle decryption failure when overwriting existing config', async function () {
      configStub.get.returns({ secret: 'existing-encrypted-secret' });
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      authenticatorStub.check.returns(true);
      authenticatorStub.generate.returns('123456');
      inquireStub.returns(Promise.resolve(true));

      await TotpAddCommand.run(['--secret', validSecret]);
      expect(configStub.set.calledOnce).to.be.true;
    });
  });

  describe('config:totp:remove', function () {
    const encryptedSecret = 'encrypted-secret|iv';
    const decryptedSecret = 'JBSWY3DPEHPK3PXP';

    it('should remove TOTP configuration successfully', async function () {
      const config = {
        secret: encryptedSecret,
        last_updated: new Date().toISOString()
      };
      configStub.get.returns(config);
      encrypterStub.decrypt.returns(decryptedSecret);
      inquireStub.returns(Promise.resolve(true));

      await TotpRemoveCommand.run([]);
      expect(configStub.delete.called).to.be.true;
      expect(configStub.delete.firstCall.args[0]).to.equal('totp');
    });

    it('should fail when no configuration exists', async function () {
      configStub.get.returns(null);
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.equal('Failed to remove configuration');
        expect(configStub.delete.called).to.be.false;
      }
    });

    it('should handle corrupted configuration gracefully', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      inquireStub.returns(Promise.resolve(false));

      await TotpRemoveCommand.run([]);
      expect(configStub.delete.called).to.be.false;
    });

    it('should cancel removal when user declines', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      encrypterStub.decrypt.returns(decryptedSecret);
      inquireStub.returns(Promise.resolve(false));

      await TotpRemoveCommand.run([]);
      expect(configStub.delete.called).to.be.false;
    });

    it('should remove configuration without confirmation when forced', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      await TotpRemoveCommand.run(['-y']);
      expect(configStub.delete.called).to.be.true;
      expect(configStub.delete.firstCall.args[0]).to.equal('totp');
    });

    it('should handle deletion errors', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      configStub.delete.throws(new Error('Delete failed'));
      try {
        await TotpRemoveCommand.run(['-y']);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle invalid config format', async function () {
      configStub.get.returns({ invalid: 'config' });
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle null secret in config', async function () {
      configStub.get.returns({ secret: null });
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle undefined secret in config', async function () {
      configStub.get.returns({ secret: undefined });
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle empty string secret in config', async function () {
      configStub.get.returns({ secret: '' });
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle multiple confirmation prompts correctly', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      encrypterStub.decrypt.throws(new Error('Decryption failed'));
      
      // First prompt: "Configuration appears corrupted"
      inquireStub.onFirstCall().returns(Promise.resolve(true));
      // Second prompt: "Are you sure?"
      inquireStub.onSecondCall().returns(Promise.resolve(true));

      await TotpRemoveCommand.run([]);
      expect(configStub.delete.called).to.be.true;
    });

    it('should handle force flag with corrupted config', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      encrypterStub.decrypt.throws(new Error('Decryption failed'));

      await TotpRemoveCommand.run(['-y']);
      expect(configStub.delete.called).to.be.true;
    });

    it('should handle config.get throwing an error', async function () {
      configStub.get.throws(new Error('Failed to read config'));
      try {
        await TotpRemoveCommand.run([]);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Failed to remove configuration');
      }
    });

    it('should handle multiple decryption attempts', async function () {
      configStub.get.returns({ secret: encryptedSecret });
      // First decrypt attempt fails
      encrypterStub.decrypt.onFirstCall().throws(new Error('Decryption failed'));
      // Second decrypt attempt succeeds
      encrypterStub.decrypt.onSecondCall().returns(decryptedSecret);
      inquireStub.returns(Promise.resolve(true));

      await TotpRemoveCommand.run([]);
      expect(configStub.delete.called).to.be.true;
    });

    it('should handle invalid flags', async function () {
      try {
        await TotpRemoveCommand.run(['--invalid-flag']);
        expect.fail('Should have thrown an error');
      } catch (error: unknown) {
        const err = error as Error;
        expect(err.message).to.contain('Nonexistent flag: --invalid-flag');
      }
    });
  });
});