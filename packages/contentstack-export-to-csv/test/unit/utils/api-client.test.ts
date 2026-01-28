import { expect } from 'chai';
import {
  getOrganizations,
  getOrganizationsWhereUserIsAdmin,
  getOrgUsers,
  getOrgRoles,
  getStacks,
  getContentTypeCount,
  getContentTypes,
  getLanguages,
  getEntriesCount,
  getEntries,
  getEnvironments,
  getAllTeams,
  exportOrgTeams,
  getAllTaxonomies,
  getAllTermsOfTaxonomy,
  getTaxonomy,
  createImportableCSV,
} from '../../../src/utils/api-client';

// API client functions are tightly coupled to the Contentstack SDK
// These tests verify the function signatures and basic structure
// Full integration testing requires actual SDK mocking or E2E tests

describe('api-client', () => {
  describe('module exports', () => {
    it('should export all expected functions', () => {
      expect(getOrganizations).to.be.a('function');
      expect(getOrganizationsWhereUserIsAdmin).to.be.a('function');
      expect(getOrgUsers).to.be.a('function');
      expect(getOrgRoles).to.be.a('function');
      expect(getStacks).to.be.a('function');
      expect(getContentTypeCount).to.be.a('function');
      expect(getContentTypes).to.be.a('function');
      expect(getLanguages).to.be.a('function');
      expect(getEntriesCount).to.be.a('function');
      expect(getEntries).to.be.a('function');
      expect(getEnvironments).to.be.a('function');
      expect(getAllTeams).to.be.a('function');
      expect(exportOrgTeams).to.be.a('function');
      expect(getAllTaxonomies).to.be.a('function');
      expect(getAllTermsOfTaxonomy).to.be.a('function');
      expect(getTaxonomy).to.be.a('function');
      expect(createImportableCSV).to.be.a('function');
    });
  });

  // Note: Full functional tests for api-client require mocking the @contentstack/management SDK
  // This is complex due to the SDK's internal structure. These tests are better suited for 
  // integration testing with a test stack or using more sophisticated mocking tools.
});
