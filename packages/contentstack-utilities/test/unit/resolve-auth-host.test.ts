import { expect } from 'chai';
import * as sinon from 'sinon';
import configHandler from '../../src/config-handler';
import { resolveAuthHost } from '../../src/feature-status/resolve-auth-host';

describe('resolveAuthHost', () => {
  let getStub: sinon.SinonStub;

  afterEach(() => {
    getStub?.restore();
  });

  it('should use endpoints.auth when present on the passed context', () => {
    const host = resolveAuthHost({ region: { endpoints: { auth: 'https://auth-api.contentstack.com/' } } });
    expect(host).to.equal('https://auth-api.contentstack.com');
  });

  it('should fall back to deriving from cma when endpoints.auth is missing', () => {
    const host = resolveAuthHost({ region: { cma: 'https://api.contentstack.io' } });
    expect(host).to.equal('https://auth-api.contentstack.com');
  });

  it('should not persist the derived fallback', () => {
    const setStub = sinon.stub(configHandler, 'set');
    resolveAuthHost({ region: { cma: 'https://api.contentstack.io' } });
    expect(setStub.called).to.be.false;
    setStub.restore();
  });

  it('should read region from configHandler when no ctx.region is given', () => {
    getStub = sinon
      .stub(configHandler, 'get')
      .callsFake((key) => (key === 'region' ? { endpoints: { auth: 'https://auth-api.contentstack.com' } } : undefined));
    const host = resolveAuthHost();
    expect(host).to.equal('https://auth-api.contentstack.com');
  });

  it('should throw when both endpoints.auth and cma are missing', () => {
    expect(() => resolveAuthHost({ region: {} })).to.throw(/PLAN_CHECK: Auth host is not configured/);
  });

  it('should throw when region is entirely absent', () => {
    getStub = sinon.stub(configHandler, 'get').returns(undefined);
    expect(() => resolveAuthHost()).to.throw(/PLAN_CHECK: Auth host is not configured/);
  });
});
