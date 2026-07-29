import { expect } from 'chai';
import { resolveCanonicalEndpoints, buildRegionFromEndpoints } from '../../src/region-endpoints';

describe('region-endpoints', () => {
  describe('resolveCanonicalEndpoints', () => {
    it('should resolve endpoints for a known region name', () => {
      const endpoints = resolveCanonicalEndpoints('NA');
      expect(endpoints).to.not.be.null;
      expect(endpoints.contentManagement).to.equal('https://api.contentstack.io');
      expect(endpoints.auth).to.equal('https://auth-api.contentstack.com');
    });

    it('should resolve endpoints via a known alias', () => {
      const endpoints = resolveCanonicalEndpoints('us');
      expect(endpoints).to.not.be.null;
      expect(endpoints.contentManagement).to.equal('https://api.contentstack.io');
    });

    it('should return null for an unrecognized/custom region name', () => {
      const endpoints = resolveCanonicalEndpoints('My Totally Custom Region');
      expect(endpoints).to.be.null;
    });
  });

  describe('buildRegionFromEndpoints', () => {
    it('should map named fields and include the full raw endpoints passthrough', () => {
      const endpoints = resolveCanonicalEndpoints('EU');
      const region = buildRegionFromEndpoints('EU', endpoints);

      expect(region.name).to.equal('EU');
      expect(region.cma).to.equal(endpoints.contentManagement);
      expect(region.cda).to.equal(endpoints.contentDelivery);
      expect(region.uiHost).to.equal(endpoints.application);
      expect(region.developerHubUrl).to.equal(endpoints.developerHub);
      expect(region.launchHubUrl).to.equal(endpoints.launch);
      expect(region.personalizeUrl).to.equal(endpoints.personalizeManagement);
      expect(region.composableStudioUrl).to.equal(endpoints.composableStudio);
      expect(region.endpoints).to.equal(endpoints);
      expect(region.endpoints.auth).to.equal(endpoints.auth);
      // future fields not yet named on the interface remain reachable via `.endpoints`
      expect(region.endpoints.assets).to.be.a('string');
    });
  });
});
