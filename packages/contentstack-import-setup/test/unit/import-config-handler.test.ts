import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { stub, restore, SinonStub } from 'sinon';
import * as utilities from '@contentstack/cli-utilities';
import setupConfig from '../../src/utils/import-config-handler';
import * as interactive from '../../src/utils/interactive';

describe('Import Config Handler', () => {
  const tmpDir = path.join(os.tmpdir(), `import-config-test-${Date.now()}`);
  const contentDir = path.join(tmpDir, 'content');

  let configHandlerGetStub: SinonStub;
  let askContentDirStub: SinonStub;
  let askAPIKeyStub: SinonStub;
  let askSelectedModulesStub: SinonStub;

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(contentDir, { recursive: true });

    // Use Object.defineProperty to override the getter
    Object.defineProperty(utilities.authHandler, 'isAuthenticated', {
      value: () => true,
      configurable: true,
      writable: true,
    });
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    restore();

    configHandlerGetStub = stub(utilities.configHandler, 'get');
    askContentDirStub = stub(interactive, 'askContentDir').resolves(contentDir);
    askAPIKeyStub = stub(interactive, 'askAPIKey').resolves('mock-api-key');
    stub(utilities.cliux, 'print');
    askSelectedModulesStub = stub(interactive, 'askSelectedModules').resolves('entries');
  });

  afterEach(() => {
    restore();
  });

  it('should use provided data directory', async () => {
    const flags = {
      'data-dir': contentDir,
    };

    const config = await setupConfig(flags);

    expect(config.contentDir).to.equal(path.resolve(contentDir));
    expect(config.data).to.equal(config.contentDir);
  });

  it('should ask for content directory if not provided', async () => {
    const flags = {};

    const config = await setupConfig(flags);

    expect(askContentDirStub.calledOnce).to.be.true;
    expect(config.contentDir).to.equal(path.resolve(contentDir));
  });

  it('should use provided stack API key', async () => {
    const flags = {
      'stack-api-key': 'test-stack-key',
    };

    const config = await setupConfig(flags);

    expect(config.apiKey).to.equal('test-stack-key');
  });

  it('should ask for API key if not provided', async () => {
    const flags = {};

    const config = await setupConfig(flags);

    expect(askAPIKeyStub.calledOnce).to.be.true;
    expect(config.apiKey).to.equal('mock-api-key');
  });

  it('should use management token if alias provided', async () => {
    const flags = {
      'management-token-alias': 'my-token',
    };

    configHandlerGetStub.returns({
      token: 'mock-management-token',
      apiKey: 'mock-api-key',
    });

    const config = await setupConfig(flags);

    expect(config.management_token).to.equal('mock-management-token');
    expect(config.apiKey).to.equal('mock-api-key');
  });

  it('should use provided modules', async () => {
    const flags = {
      module: ['entries', 'assets'],
    };

    const config = await setupConfig(flags);

    expect(config.selectedModules).to.deep.equal(['entries', 'assets']);
  });

  it('should include branch name when provided', async () => {
    const flags = {
      branch: 'development',
    };

    const config = await setupConfig(flags);

    expect(config.branchName).to.equal('development');
  });

  it('should set default content version to 1', async () => {
    const flags = {
      'data-dir': contentDir,
    };

    const config = await setupConfig(flags);

    expect(config.contentVersion).to.equal(1);
  });

  it('should ask for modules when none are provided', async () => {
    const flags = {
      'data-dir': contentDir,
    };

    const config = await setupConfig(flags);

    expect(askSelectedModulesStub.calledOnce).to.be.true;
    expect(config.selectedModules).to.deep.equal(['entries']);
  });
});
