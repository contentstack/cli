import { expect } from 'chai';

// API client functions are tightly coupled to the Contentstack SDK
// These tests verify the function signatures and basic structure
// Full integration testing requires actual SDK mocking or E2E tests

describe('api-client', () => {
  describe('module exports', () => {
    it('should export all expected functions', async () => {
      // Import from the barrel export with explicit index.js
      const utils = await import('../../../dist/utils/index.js');

      expect(utils.getOrganizations).to.be.a('function');
      expect(utils.getOrganizationsWhereUserIsAdmin).to.be.a('function');
      expect(utils.getOrgUsers).to.be.a('function');
      expect(utils.getOrgRoles).to.be.a('function');
      expect(utils.getStacks).to.be.a('function');
      expect(utils.getContentTypeCount).to.be.a('function');
      expect(utils.getContentTypes).to.be.a('function');
      expect(utils.getLanguages).to.be.a('function');
      expect(utils.getEntriesCount).to.be.a('function');
      expect(utils.getEntries).to.be.a('function');
      expect(utils.getEnvironments).to.be.a('function');
      expect(utils.getAllTeams).to.be.a('function');
      expect(utils.exportOrgTeams).to.be.a('function');
      expect(utils.getAllTaxonomies).to.be.a('function');
      expect(utils.getAllTermsOfTaxonomy).to.be.a('function');
      expect(utils.getTaxonomy).to.be.a('function');
      expect(utils.createImportableCSV).to.be.a('function');
    });
  });

  // Note: Full functional tests for api-client require mocking the @contentstack/management SDK
  // This is complex due to the SDK's internal structure. These tests are better suited for 
  // integration testing with a test stack or using more sophisticated mocking tools.
});
