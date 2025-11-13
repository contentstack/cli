import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'node:path';
import * as utilities from '@contentstack/cli-utilities';
import {
  askPassword,
  askOTPChannel,
  askOTP,
  askUsername,
  askExportDir,
  askAPIKey,
} from '../../../src/utils/interactive';

describe('Interactive Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let inquireStub: sinon.SinonStub;
  let processCwdStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    inquireStub = sandbox.stub(utilities.cliux, 'inquire');
    processCwdStub = sandbox.stub(process, 'cwd').returns('/current/working/directory');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('askPassword', () => {
    it('should prompt for password and mask the input', async () => {
      const mockPassword = 'testPassword123';
      inquireStub.resolves(mockPassword);

      const result = await askPassword();

      expect(result).to.equal(mockPassword);
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.message).to.equal('CLI_AUTH_LOGIN_ENTER_PASSWORD');
      expect(inquireArgs.name).to.equal('password');
      expect(inquireArgs.transformer).to.be.a('function');

      // Test the transformer function
      const masked = inquireArgs.transformer('test123');
      expect(masked).to.equal('*******');
    });

    it('should mask empty password correctly', async () => {
      const mockPassword = '';
      inquireStub.resolves(mockPassword);
      
      inquireStub.callsFake((options: any) => {
        const masked = options.transformer('');
        expect(masked).to.equal('');
        return Promise.resolve(mockPassword);
      });

      await askPassword();
      expect(inquireStub.calledOnce).to.be.true;
    });

    it('should mask password with special characters correctly', async () => {
      inquireStub.callsFake((options: any) => {
        const masked = options.transformer('P@ssw0rd!');
        expect(masked).to.equal('*********');
        return Promise.resolve('P@ssw0rd!');
      });

      await askPassword();
      expect(inquireStub.calledOnce).to.be.true;
    });
  });

  describe('askOTPChannel', () => {
    it('should prompt for OTP channel selection', async () => {
      const mockChannel = 'authy';
      inquireStub.resolves(mockChannel);

      const result = await askOTPChannel();

      expect(result).to.equal(mockChannel);
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('list');
      expect(inquireArgs.message).to.equal('CLI_AUTH_LOGIN_ASK_CHANNEL_FOR_OTP');
      expect(inquireArgs.name).to.equal('otpChannel');
      expect(inquireArgs.choices).to.be.an('array');
      expect(inquireArgs.choices).to.have.length(2);
      expect(inquireArgs.choices[0]).to.deep.equal({ name: 'Authy App', value: 'authy' });
      expect(inquireArgs.choices[1]).to.deep.equal({ name: 'SMS', value: 'sms' });
    });

    it('should return sms when selected', async () => {
      inquireStub.resolves('sms');

      const result = await askOTPChannel();

      expect(result).to.equal('sms');
    });
  });

  describe('askOTP', () => {
    it('should prompt for OTP security code', async () => {
      const mockOTP = '123456';
      inquireStub.resolves(mockOTP);

      const result = await askOTP();

      expect(result).to.equal(mockOTP);
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.message).to.equal('CLI_AUTH_LOGIN_ENTER_SECURITY_CODE');
      expect(inquireArgs.name).to.equal('tfaToken');
    });

    it('should handle different OTP formats', async () => {
      const testCases = ['123456', '654321', '000000'];
      
      for (const testOTP of testCases) {
        inquireStub.resolves(testOTP);
        const result = await askOTP();
        expect(result).to.equal(testOTP);
      }
    });
  });

  describe('askUsername', () => {
    it('should prompt for email address', async () => {
      const mockEmail = 'test@example.com';
      inquireStub.resolves(mockEmail);

      const result = await askUsername();

      expect(result).to.equal(mockEmail);
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.message).to.equal('CLI_AUTH_LOGIN_ENTER_EMAIL_ADDRESS');
      expect(inquireArgs.name).to.equal('username');
    });

    it('should accept various email formats', async () => {
      const testEmails = [
        'user@example.com',
        'user.name@example.co.uk',
        'user+tag@example-domain.com',
      ];

      for (const email of testEmails) {
        inquireStub.resolves(email);
        const result = await askUsername();
        expect(result).to.equal(email);
      }
    });
  });

  describe('askExportDir', () => {
    it('should prompt for export directory path', async () => {
      const mockPath = '/test/export/path';
      inquireStub.resolves(mockPath);

      const result = await askExportDir();

      expect(result).to.equal(path.resolve(mockPath));
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.message).to.equal('Enter the path for storing the content: (current folder)');
      expect(inquireArgs.name).to.equal('dir');
      expect(inquireArgs.validate).to.equal(utilities.validatePath);
    });

    it('should use current working directory when result is empty', async () => {
      const mockCwd = '/custom/working/dir';
      processCwdStub.returns(mockCwd);
      inquireStub.resolves('');

      const result = await askExportDir();

      expect(result).to.equal(mockCwd);
      expect(inquireStub.calledOnce).to.be.true;
    });

    it('should use current working directory when result is null', async () => {
      const mockCwd = '/custom/working/dir';
      processCwdStub.returns(mockCwd);
      inquireStub.resolves(null as any);

      const result = await askExportDir();

      expect(result).to.equal(mockCwd);
    });

    it('should remove quotes from path', async () => {
      const mockPathWithQuotes = '"/test/path"';
      inquireStub.resolves(mockPathWithQuotes);

      const result = await askExportDir();

      expect(result).to.equal(path.resolve('/test/path'));
    });

    it('should remove single quotes from path', async () => {
      const mockPathWithQuotes = "'/test/path'";
      inquireStub.resolves(mockPathWithQuotes);

      const result = await askExportDir();

      expect(result).to.equal(path.resolve('/test/path'));
    });

    it('should handle relative paths', async () => {
      const mockRelativePath = './export';
      inquireStub.resolves(mockRelativePath);

      const result = await askExportDir();

      expect(result).to.equal(path.resolve(mockRelativePath));
    });

    it('should handle paths with multiple quotes', async () => {
      const mockPath = '"\'/test/path\'"';
      inquireStub.resolves(mockPath);

      const result = await askExportDir();

      expect(result).to.equal(path.resolve('/test/path'));
    });

    it('should use validatePath function for validation', async () => {
      inquireStub.resolves('/valid/path');

      await askExportDir();

      // The validatePath function should be passed to inquire
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.validate).to.equal(utilities.validatePath);
    });
  });

  describe('askAPIKey', () => {
    it('should prompt for stack API key', async () => {
      const mockAPIKey = 'blt1234567890abcdef';
      inquireStub.resolves(mockAPIKey);

      const result = await askAPIKey();

      expect(result).to.equal(mockAPIKey);
      expect(inquireStub.calledOnce).to.be.true;
      
      const inquireArgs = inquireStub.firstCall.args[0];
      expect(inquireArgs.type).to.equal('input');
      expect(inquireArgs.message).to.equal('Enter the stack api key');
      expect(inquireArgs.name).to.equal('apiKey');
    });

    it('should return the API key as provided', async () => {
      const testAPIKeys = [
        'blt123',
        'blt1234',
        'blt12345',
      ];

      for (const apiKey of testAPIKeys) {
        inquireStub.resolves(apiKey);
        const result = await askAPIKey();
        expect(result).to.equal(apiKey);
      }
    });
  });
});

