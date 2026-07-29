import { expect } from 'chai';
import * as sinon from 'sinon';
import configHandler from '../../src/config-handler';
import { refreshRegionEndpoints } from '../../src/region-refresh';

describe('refreshRegionEndpoints', () => {
  let getStub: sinon.SinonStub;
  let setStub: sinon.SinonStub;

  afterEach(() => {
    getStub?.restore();
    setStub?.restore();
  });

  it('should do nothing when no region is stored', () => {
    getStub = sinon.stub(configHandler, 'get').returns(undefined);
    setStub = sinon.stub(configHandler, 'set');

    refreshRegionEndpoints();

    expect(setStub.called).to.be.false;
  });

  it('should backfill and persist a named region missing endpoints', () => {
    const stale = {
      name: 'NA',
      cma: 'https://api.contentstack.io',
      cda: 'https://cdn.contentstack.io',
      uiHost: 'https://app.contentstack.com',
    };
    getStub = sinon.stub(configHandler, 'get').callsFake((key) => (key === 'region' ? stale : undefined));
    setStub = sinon.stub(configHandler, 'set');

    refreshRegionEndpoints();

    expect(setStub.calledOnce).to.be.true;
    const [key, merged] = setStub.firstCall.args;
    expect(key).to.equal('region');
    expect(merged.endpoints).to.be.an('object');
    expect(merged.endpoints.auth).to.equal('https://auth-api.contentstack.com');
  });

  it('should not write when the named region is already fully healed', () => {
    // First refresh to compute the canonical/healed shape, without touching config.
    const stale = { name: 'AWS-NA' };
    getStub = sinon.stub(configHandler, 'get').callsFake((key) => (key === 'region' ? stale : undefined));
    setStub = sinon.stub(configHandler, 'set');
    refreshRegionEndpoints();
    const healed = setStub.firstCall.args[1];

    getStub.restore();
    setStub.restore();

    getStub = sinon.stub(configHandler, 'get').callsFake((key) => (key === 'region' ? healed : undefined));
    setStub = sinon.stub(configHandler, 'set');

    refreshRegionEndpoints();

    expect(setStub.called).to.be.false;
  });

  it('should leave a custom/unrecognized region untouched', () => {
    const custom = {
      name: 'My Totally Custom Region',
      cma: 'https://custom-cma.com',
      cda: 'https://custom-cda.com',
      uiHost: 'https://custom-ui.com',
    };
    getStub = sinon.stub(configHandler, 'get').callsFake((key) => (key === 'region' ? custom : undefined));
    setStub = sinon.stub(configHandler, 'set');

    expect(() => refreshRegionEndpoints()).to.not.throw();
    expect(setStub.called).to.be.false;
  });
});
