import { expect } from 'chai';
import sinon from 'sinon';
import * as path from 'path';
import {
  askContentDir,
  askAPIKey,
  askEncryptionKey,
  askAppName,
  getAppName,
  getLocationName,
  selectConfiguration,
  askBranchSelection,
} from '../../../src/utils/interactive';

describe('Interactive Utils', () => {
  let sandbox: sinon.SinonSandbox;
  let cliuxInquireStub: sinon.SinonStub;
  const cliUtilities = require('@contentstack/cli-utilities');

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    cliuxInquireStub = sandbox.stub(cliUtilities.cliux, 'inquire');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('askContentDir', () => {
    it('should return resolved path from user input', async () => {
      const testPath = '/test/content/dir';
      cliuxInquireStub.resolves(testPath);

      const result = await askContentDir();

      expect(result).to.be.a('string');
      expect(result).to.equal(path.resolve(testPath));
      expect(cliuxInquireStub.calledOnce).to.be.true;
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('type', 'input');
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('message', 'Enter the path for the content');
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('name', 'dir');
    });

    it('should remove quotes and double quotes from path', async () => {
      const testPath = '"/test/content/dir"';
      cliuxInquireStub.resolves(testPath);

      const result = await askContentDir();

      expect(result).to.not.include('"');
      expect(result).to.not.include("'");
    });

    it('should remove single quotes from path', async () => {
      const testPath = "'/test/content/dir'";
      cliuxInquireStub.resolves(testPath);

      const result = await askContentDir();

      expect(result).to.not.include("'");
      expect(result).to.not.include('"');
    });

    it('should resolve relative paths to absolute paths', async () => {
      const relativePath = './test/content';
      cliuxInquireStub.resolves(relativePath);

      const result = await askContentDir();

      expect(path.isAbsolute(result)).to.be.true;
    });

    it('should handle paths with special characters after sanitization', async () => {
      const testPath = '/test/path with spaces';
      cliuxInquireStub.resolves(testPath);

      const result = await askContentDir();

      expect(result).to.be.a('string');
      expect(path.isAbsolute(result)).to.be.true;
    });
  });

  describe('askAPIKey', () => {
    it('should return API key from user input', async () => {
      const apiKey = 'test-api-key-123';
      cliuxInquireStub.resolves(apiKey);

      const result = await askAPIKey();

      expect(result).to.equal(apiKey);
      expect(cliuxInquireStub.calledOnce).to.be.true;
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('type', 'input');
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('message', 'Enter the stack api key');
      expect(cliuxInquireStub.firstCall.args[0]).to.have.property('name', 'apiKey');
    });

    it('should handle empty string input', async () => {
      const apiKey = '';
      cliuxInquireStub.resolves(apiKey);

      const result = await askAPIKey();

      expect(result).to.equal('');
    });

    it('should handle long API keys', async () => {
      const apiKey = 'a'.repeat(100);
      cliuxInquireStub.resolves(apiKey);

      const result = await askAPIKey();

      expect(result).to.equal(apiKey);
      expect(result.length).to.equal(100);
    });
  });

  describe('askEncryptionKey', () => {
    it('should return encryption key from user input with default value', async () => {
      const defaultValue = 'default-encryption-key';
      const userInput = 'user-encryption-key';
      cliuxInquireStub.resolves(userInput);

      const result = await askEncryptionKey(defaultValue);

      expect(result).to.equal(userInput);
      expect(cliuxInquireStub.calledOnce).to.be.true;
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('type', 'input');
      expect(inquireOptions).to.have.property('default', defaultValue);
      expect(inquireOptions).to.have.property('message', 'Enter Marketplace app configurations encryption key');
    });

    it('should validate that encryption key is not empty', async () => {
      const defaultValue = 'default-key';
      cliuxInquireStub.resolves('');

      const result = await askEncryptionKey(defaultValue);

      expect(result).to.equal('');
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('validate');
      if (inquireOptions.validate) {
        const validationResult = inquireOptions.validate('');
        expect(validationResult).to.equal("Encryption key can't be empty.");
      }
    });

    it('should pass validation for non-empty key', async () => {
      const defaultValue = 'default-key';
      const validKey = 'valid-encryption-key';
      cliuxInquireStub.resolves(validKey);

      const result = await askEncryptionKey(defaultValue);

      expect(result).to.equal(validKey);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('validate');
      if (inquireOptions.validate) {
        const validationResult = inquireOptions.validate(validKey);
        expect(validationResult).to.equal(true);
      }
    });

    it('should handle null default value', async () => {
      const userInput = 'user-provided-key';
      cliuxInquireStub.resolves(userInput);

      const result = await askEncryptionKey(null);

      expect(result).to.equal(userInput);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('default', null);
    });

    it('should handle undefined default value', async () => {
      const userInput = 'user-provided-key';
      cliuxInquireStub.resolves(userInput);

      const result = await askEncryptionKey(undefined);

      expect(result).to.equal(userInput);
    });
  });

  describe('askAppName', () => {
    it('should return app name from user input with default generated name', async () => {
      const app = { name: 'TestApp' };
      const appSuffix = 1;
      const defaultName = 'TestApp◈1';
      const userInput = 'MyCustomAppName';
      cliuxInquireStub.resolves(userInput);

      const result = await askAppName(app, appSuffix);

      expect(result).to.equal(userInput);
      expect(cliuxInquireStub.calledOnce).to.be.true;
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('type', 'input');
      expect(inquireOptions).to.have.property('name', 'name');
      expect(inquireOptions).to.have.property('default', defaultName);
      expect(inquireOptions).to.have.property('message', `${app.name} app already exist. Enter a new name to create an app.?`);
    });

    it('should validate app name length (minimum 3 characters)', async () => {
      const app = { name: 'TestApp' };
      const appSuffix = 1;
      cliuxInquireStub.resolves('ab'); // Too short

      const result = await askAppName(app, appSuffix);

      expect(result).to.equal('ab');
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('validate');
      if (inquireOptions.validate) {
        const validationResult = inquireOptions.validate('ab');
        expect(validationResult).to.equal('The app name should be within 3-20 characters long.');
      }
    });

    it('should validate app name length (maximum 20 characters)', async () => {
      const app = { name: 'TestApp' };
      const appSuffix = 1;
      cliuxInquireStub.resolves('a'.repeat(21)); // Too long

      const result = await askAppName(app, appSuffix);

      expect(result).to.equal('a'.repeat(21));
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('validate');
      if (inquireOptions.validate) {
        const validationResult = inquireOptions.validate('a'.repeat(21));
        expect(validationResult).to.equal('The app name should be within 3-20 characters long.');
      }
    });

    it('should pass validation for valid app name length', async () => {
      const app = { name: 'TestApp' };
      const appSuffix = 1;
      const validName = 'ValidAppName';
      cliuxInquireStub.resolves(validName);

      const result = await askAppName(app, appSuffix);

      expect(result).to.equal(validName);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('validate');
      if (inquireOptions.validate) {
        const validationResult = inquireOptions.validate(validName);
        expect(validationResult).to.equal(true);
      }
    });

    it('should use default name when user provides empty input', async () => {
      const app = { name: 'TestApp' };
      const appSuffix = 2;
      const defaultName = 'TestApp◈2';
      cliuxInquireStub.resolves(defaultName);

      const result = await askAppName(app, appSuffix);

      expect(result).to.equal(defaultName);
    });
  });

  describe('getAppName', () => {
    it('should return app name with suffix when name is short', () => {
      const name = 'TestApp';
      const suffix = 1;
      const result = getAppName(name, suffix);

      expect(result).to.equal('TestApp◈1');
    });

    it('should truncate name to 18 characters when name is 19 or more characters', () => {
      const longName = 'a'.repeat(19);
      const suffix = 1;
      const result = getAppName(longName, suffix);

      expect(result).to.equal('a'.repeat(18) + '◈1');
      expect(result.length).to.equal(20); // 18 chars + ◈ + 1
    });

    it('should truncate name to 18 characters when name is exactly 18 characters', () => {
      const name = 'a'.repeat(18);
      const suffix = 1;
      const result = getAppName(name, suffix);

      expect(result).to.equal(name + '◈1');
    });

    it('should handle name with existing separator', () => {
      const name = 'TestApp◈5';
      const suffix = 2;
      const result = getAppName(name, suffix);

      expect(result).to.equal('TestApp◈2');
    });

    it('should handle multiple separators in name', () => {
      const name = 'Test◈App◈Name';
      const suffix = 3;
      const result = getAppName(name, suffix);

      expect(result).to.equal('Test◈3');
    });

    it('should use default suffix of 1 when not provided', () => {
      const name = 'TestApp';
      const result = getAppName(name);

      expect(result).to.equal('TestApp◈1');
    });

    it('should handle empty name', () => {
      const name = '';
      const suffix = 1;
      const result = getAppName(name, suffix);

      expect(result).to.equal('◈1');
    });

    it('should handle very long name with high suffix number', () => {
      const longName = 'a'.repeat(50);
      const suffix = 123;
      const result = getAppName(longName, suffix);

      expect(result).to.equal('a'.repeat(18) + '◈123');
    });
  });

  describe('getLocationName', () => {
    it('should return location name with suffix when within max length', () => {
      const name = 'TestLocation';
      const suffix = 1;
      const existingNames = new Set<string>();
      const result = getLocationName(name, suffix, existingNames);

      expect(result).to.equal('TestLocation◈1');
      expect(existingNames.has(result)).to.be.true;
    });

    it('should truncate name when it exceeds max length of 50', () => {
      const longName = 'a'.repeat(60);
      const suffix = 1;
      const existingNames = new Set<string>();
      const result = getLocationName(longName, suffix, existingNames);

      expect(result.length).to.be.at.most(50);
      expect(result).to.include('◈1');
    });

    it('should ensure uniqueness by incrementing suffix if name already exists', () => {
      const name = 'TestLocation';
      const suffix = 1;
      const existingNames = new Set<string>(['TestLocation◈1']);
      const result = getLocationName(name, suffix, existingNames);

      expect(result).to.equal('TestLocation◈2');
      expect(existingNames.has(result)).to.be.true;
    });

    it('should continue incrementing until unique name is found', () => {
      const name = 'TestLocation';
      const suffix = 1;
      const existingNames = new Set<string>(['TestLocation◈1', 'TestLocation◈2', 'TestLocation◈3']);
      const result = getLocationName(name, suffix, existingNames);

      expect(result).to.equal('TestLocation◈4');
      expect(existingNames.has(result)).to.be.true;
    });

    it('should handle name with existing separator', () => {
      const name = 'TestLocation◈5';
      const suffix = 1;
      const existingNames = new Set<string>();
      const result = getLocationName(name, suffix, existingNames);

      // getLocationName splits by ◈ and takes first part, then adds suffix
      // 'TestLocation◈5' -> 'TestLocation' -> 'TestLocation◈1'
      expect(result).to.equal('TestLocation◈1');
      expect(existingNames.has(result)).to.be.true;
    });

    it('should calculate suffix length correctly for multi-digit suffixes', () => {
      const longName = 'a'.repeat(45);
      const suffix = 123;
      const existingNames = new Set<string>();
      const result = getLocationName(longName, suffix, existingNames);

      // 45 chars + suffix length (123 = 3) + separator (1) = 49, should be within 50
      expect(result.length).to.be.at.most(50);
      expect(result).to.include('◈123');
    });

    it('should truncate when name + suffix length exceeds 50', () => {
      const name = 'a'.repeat(48);
      const suffix = 123;
      const existingNames = new Set<string>();
      const result = getLocationName(name, suffix, existingNames);

      expect(result.length).to.be.at.most(50);
      expect(result).to.include('◈123');
    });

    it('should handle empty name', () => {
      const name = '';
      const suffix = 1;
      const existingNames = new Set<string>();
      const result = getLocationName(name, suffix, existingNames);

      expect(result).to.equal('◈1');
      expect(existingNames.has(result)).to.be.true;
    });

    it('should add new name to existing names set', () => {
      const name = 'NewLocation';
      const suffix = 1;
      const existingNames = new Set<string>();
      getLocationName(name, suffix, existingNames);

      expect(existingNames.has('NewLocation◈1')).to.be.true;
    });
  });

  describe('selectConfiguration', () => {
    it('should return selected configuration option', async () => {
      const selectedOption = 'Update it with the new configuration.';
      cliuxInquireStub.resolves(selectedOption);

      const result = await selectConfiguration();

      expect(result).to.equal(selectedOption);
      expect(cliuxInquireStub.calledOnce).to.be.true;
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('type', 'list');
      expect(inquireOptions).to.have.property('name', 'value');
      expect(inquireOptions).to.have.property('message', 'Choose the option to proceed');
      expect(inquireOptions).to.have.property('choices');
      expect(inquireOptions.choices).to.be.an('array');
      expect(inquireOptions.choices).to.have.length(3);
    });

    it('should include all three configuration options in choices', async () => {
      const selectedOption = 'Exit';
      cliuxInquireStub.resolves(selectedOption);

      await selectConfiguration();

      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions.choices).to.include('Update it with the new configuration.');
      expect(inquireOptions.choices).to.include(
        'Do not update the configuration (WARNING!!! If you do not update the configuration, there may be some issues with the content which you import).',
      );
      expect(inquireOptions.choices).to.include('Exit');
    });

    it('should return "Do not update" option when selected', async () => {
      const selectedOption =
        'Do not update the configuration (WARNING!!! If you do not update the configuration, there may be some issues with the content which you import).';
      cliuxInquireStub.resolves(selectedOption);

      const result = await selectConfiguration();

      expect(result).to.equal(selectedOption);
    });

    it('should return "Exit" option when selected', async () => {
      const selectedOption = 'Exit';
      cliuxInquireStub.resolves(selectedOption);

      const result = await selectConfiguration();

      expect(result).to.equal(selectedOption);
    });
  });

  describe('askBranchSelection', () => {
    it('should return selected branch from branch names list', async () => {
      const branchNames = ['main', 'develop', 'feature/test'];
      const selectedBranch = 'develop';
      cliuxInquireStub.resolves(selectedBranch);

      const result = await askBranchSelection(branchNames);

      expect(result).to.equal(selectedBranch);
      expect(cliuxInquireStub.calledOnce).to.be.true;
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions).to.have.property('type', 'list');
      expect(inquireOptions).to.have.property('name', 'branch');
      expect(inquireOptions).to.have.property('message', 'Found multiple branches in your export path. Please select one to import:');
      expect(inquireOptions).to.have.property('choices', branchNames);
    });

    it('should handle single branch selection', async () => {
      const branchNames = ['main'];
      const selectedBranch = 'main';
      cliuxInquireStub.resolves(selectedBranch);

      const result = await askBranchSelection(branchNames);

      expect(result).to.equal(selectedBranch);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions.choices).to.deep.equal(branchNames);
    });

    it('should handle multiple branch names', async () => {
      const branchNames = ['main', 'develop', 'staging', 'production', 'feature/new-feature'];
      const selectedBranch = 'feature/new-feature';
      cliuxInquireStub.resolves(selectedBranch);

      const result = await askBranchSelection(branchNames);

      expect(result).to.equal(selectedBranch);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions.choices).to.deep.equal(branchNames);
    });

    it('should handle empty branch names array', async () => {
      const branchNames: string[] = [];
      const selectedBranch = '';
      cliuxInquireStub.resolves(selectedBranch);

      const result = await askBranchSelection(branchNames);

      expect(result).to.equal(selectedBranch);
      const inquireOptions = cliuxInquireStub.firstCall.args[0];
      expect(inquireOptions.choices).to.deep.equal(branchNames);
    });

    it('should handle branch names with special characters', async () => {
      const branchNames = ['main', 'feature/test-branch', 'hotfix/bug-fix'];
      const selectedBranch = 'feature/test-branch';
      cliuxInquireStub.resolves(selectedBranch);

      const result = await askBranchSelection(branchNames);

      expect(result).to.equal(selectedBranch);
    });
  });
});
