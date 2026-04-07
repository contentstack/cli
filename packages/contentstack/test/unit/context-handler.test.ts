import { expect } from 'chai';
import * as sinon from 'sinon';
import CsdxContext from '../../src/utils/context-handler';
import { configHandler } from '@contentstack/cli-utilities';

describe('CsdxContext', () => {
  let configHandlerGetStub: sinon.SinonStub;
  let configHandlerSetStub: sinon.SinonStub;

  const mockCliOpts = { id: 'config:get:region' };
  const mockCliConfig = {
    findCommand: () => ({ pluginName: undefined }),
    platform: 'darwin',
    arch: 'x64',
    version: '1.0.0',
    plugins: new Map(),
  };

  beforeEach(() => {
    configHandlerGetStub = sinon.stub(configHandler, 'get');
    configHandlerSetStub = sinon.stub(configHandler, 'set');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should generate sessionId and set it in configHandler', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.sessionId).to.be.a('string');
    expect(ctx.sessionId.length).to.be.greaterThan(0);
    expect(configHandlerSetStub.calledWith('sessionId', ctx.sessionId)).to.be.true;
  });

  it('should use existing clientId from config when present', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.clientId).to.equal('existing-client-id');
  });

  it('should set clientId in config when not present', () => {
    configHandlerGetStub.withArgs('clientId').returns(undefined);
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.clientId).to.be.a('string');
    expect(ctx.clientId.length).to.be.greaterThan(0);
    expect(configHandlerSetStub.calledWith('clientId', ctx.clientId)).to.be.true;
  });

  it('should populate user from config', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns('token123');
    configHandlerGetStub.withArgs('email').returns('user@example.com');
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.user).to.deep.equal({ authtoken: 'token123', email: 'user@example.com' });
  });

  it('should populate region from config', () => {
    const region = { cma: 'api.contentstack.io', cda: 'cdn.contentstack.io' };
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(region);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.region).to.deep.equal(region);
  });

  it('should build analyticsInfo string with platform, node version, cli version', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.analyticsInfo).to.include('darwin-x64');
    expect(ctx.analyticsInfo).to.include('existing-client-id');
    expect(ctx.analyticsInfo).to.include('1.0.0');
  });

  it('getToken should return token for alias from config', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);
    configHandlerGetStub.withArgs('tokens.my-alias').returns({ token: 'secret', apiKey: 'key' });

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    const token = ctx.getToken('my-alias');
    expect(token).to.deep.equal({ token: 'secret', apiKey: 'key' });
  });

  it('getToken should return undefined when alias is not provided', () => {
    configHandlerGetStub.withArgs('clientId').returns('existing-client-id');
    configHandlerGetStub.withArgs('authtoken').returns(undefined);
    configHandlerGetStub.withArgs('email').returns(undefined);
    configHandlerGetStub.withArgs('region').returns(undefined);

    const ctx = new CsdxContext(mockCliOpts, mockCliConfig);
    expect(ctx.getToken(undefined as unknown as string)).to.be.undefined;
  });
});
