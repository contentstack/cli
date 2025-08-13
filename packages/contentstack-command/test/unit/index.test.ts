import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import * as ContentstackDeliverySDK from 'contentstack';
import { configHandler, CLIError, cliux } from '@contentstack/cli-utilities';
import { Command } from '../../src';

// Create a concrete implementation of the abstract class for testing
class TestCommand extends Command {
  async run() {
    // Implementation not needed for tests
  }
}

describe('ContentstackCommand', () => {
  let command: TestCommand;
  let configHandlerGetStub: SinonStub;
  let cliuxPrintStub: SinonStub;
  let processExitStub: SinonStub;

  beforeEach(() => {
    // Create stubs
    configHandlerGetStub = stub(configHandler, 'get');
    cliuxPrintStub = stub(cliux, 'print');
    processExitStub = stub(process, 'exit');

    // Set default stubs
    configHandlerGetStub.withArgs('email').returns('test@example.com');
    configHandlerGetStub.withArgs('region').returns({
      cma: 'api.contentstack.io',
      cda: 'cdn.contentstack.io',
      uiHost: 'app.contentstack.com',
      developerHubUrl: 'developer.contentstack.com',
      launchHubUrl: 'launch.contentstack.com',
      personalizeUrl: 'personalize.contentstack.com',
    });
    configHandlerGetStub.withArgs('rate-limit').returns('10');
    configHandlerGetStub.withArgs('tokens.test-alias').returns('test-token');

    // Initialize command with a mock config
    const mockConfig = {
      context: { test: 'context' },
      options: {},
      arch: 'x64',
      bin: 'csdx',
      cacheDir: '/tmp/cache',
      channel: 'stable',
      commandsDir: '/commands',
      configDir: '/config',
      dataDir: '/data',
      debug: false,
      home: '/home',
      name: 'test-command',
      platform: 'darwin',
      root: '/root',
      userAgent: 'test-agent',
      version: '1.0.0',
      windows: false,
      plugins: [],
      pjson: { version: '1.0.0' },
      topicSeparator: ':',
    };

    command = new TestCommand([], mockConfig as any);
  });

  afterEach(() => {
    restore();
  });

  describe('context', () => {
    it('should return the context from config', () => {
      expect(command.context).to.deep.equal({ test: 'context' });
    });

    it('should return empty object if context is not defined', () => {
      (command as any).config = {};
      expect(command.context).to.deep.equal({});
    });
  });

  describe('email', () => {
    it('should return the email from config', () => {
      expect(command.email).to.equal('test@example.com');
    });

    it('should throw CLIError if email is not found', () => {
      configHandlerGetStub.withArgs('email').returns(undefined);
      expect(() => command.email).to.throw(CLIError, 'You are not logged in');
    });
  });

  describe('deliveryAPIClient', () => {
    it('should return cached client on subsequent calls', () => {
      const client = command.deliveryAPIClient;
      expect(command.deliveryAPIClient).to.equal(client);
    });
  });

  describe('region', () => {
    it('should return the region from config', () => {
      const region = command.region;
      expect(region).to.have.property('cma', 'api.contentstack.io');
      expect(region).to.have.property('cda', 'cdn.contentstack.io');
    });

    it('should exit if region is not configured', () => {
      configHandlerGetStub.withArgs('region').returns(undefined);
      command.region; // Trigger getter
      expect(cliuxPrintStub.calledTwice).to.be.true;
      expect(cliuxPrintStub.firstCall.args[0]).to.include('Region not configured');
      expect(processExitStub.calledOnce).to.be.true;
      expect(processExitStub.firstCall.args[0]).to.equal(1);
    });
  });

  describe('rateLimit', () => {
    it('should return the rate limit from config', () => {
      expect(command.rateLimit).to.equal('10');
    });

    it('should return default rate limit if not configured', () => {
      configHandlerGetStub.withArgs('rate-limit').returns(undefined);
      expect(command.rateLimit).to.equal(5);
    });
  });

  describe('cmaHost', () => {
    it('should return the CMA host from region', () => {
      expect(command.cmaHost).to.equal('api.contentstack.io');
    });

    it('should extract host from URL if CMA is a URL', () => {
      configHandlerGetStub.withArgs('region').returns({
        cma: 'https://api.contentstack.io',
        cda: 'cdn.contentstack.io',
      });
      expect(command.cmaHost).to.equal('api.contentstack.io');
    });
  });

  describe('cdaHost', () => {
    it('should return the CDA host from region', () => {
      expect(command.cdaHost).to.equal('cdn.contentstack.io');
    });

    it('should extract host from URL if CDA is a URL', () => {
      configHandlerGetStub.withArgs('region').returns({
        cma: 'api.contentstack.io',
        cda: 'https://cdn.contentstack.io',
      });
      expect(command.cdaHost).to.equal('cdn.contentstack.io');
    });
  });

  describe('uiHost', () => {
    it('should return the UI host from region', () => {
      expect(command.uiHost).to.equal('app.contentstack.com');
    });
  });

  describe('cdaAPIUrl', () => {
    it('should return the CDA API URL with https prefix', () => {
      expect(command.cdaAPIUrl).to.equal('https://cdn.contentstack.io');
    });

    it('should return the CDA API URL as is if it already has http prefix', () => {
      configHandlerGetStub.withArgs('region').returns({
        cma: 'api.contentstack.io',
        cda: 'http://cdn.contentstack.io',
      });
      expect(command.cdaAPIUrl).to.equal('http://cdn.contentstack.io');
    });
  });

  describe('cmaAPIUrl', () => {
    it('should return the CMA API URL with https prefix', () => {
      expect(command.cmaAPIUrl).to.equal('https://api.contentstack.io');
    });

    it('should return the CMA API URL as is if it already has http prefix', () => {
      configHandlerGetStub.withArgs('region').returns({
        cma: 'http://api.contentstack.io',
        cda: 'cdn.contentstack.io',
      });
      expect(command.cmaAPIUrl).to.equal('http://api.contentstack.io');
    });
  });

  describe('getToken', () => {
    it('should return the token for the given alias', () => {
      expect(command.getToken('test-alias')).to.equal('test-token');
    });

    it('should throw CLIError if token is not found', () => {
      expect(() => command.getToken('non-existent')).to.throw(CLIError, 'No token found');
    });

    it('should throw CLIError if alias is not provided', () => {
      expect(() => command.getToken(undefined)).to.throw(CLIError, 'No token found');
    });
  });

  describe('developerHubUrl', () => {
    it('should return the developer hub URL from region', () => {
      expect(command.developerHubUrl).to.equal('developer.contentstack.com');
    });
  });

  describe('launchHubUrl', () => {
    it('should return the launch hub URL from region', () => {
      expect(command.launchHubUrl).to.equal('launch.contentstack.com');
    });
  });

  describe('personalizeUrl', () => {
    it('should return the personalize URL from region', () => {
      expect(command.personalizeUrl).to.equal('personalize.contentstack.com');
    });
  });
});
