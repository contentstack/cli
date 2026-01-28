/**
 * Utility module exports.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

// Error handling
export { formatError, handleErrorMsg, handleTaxonomyErrorMsg, wait, exitProgram } from './error-handler';

// Data transformation
export {
  flatten,
  sanitizeData,
  cleanEntries,
  getMappedUsers,
  getMappedRoles,
  determineUserOrgRole,
  cleanOrgUsers,
  cleanTeamsData,
  getTeamsUserDetails,
  formatTaxonomiesData,
  formatTermsOfTaxonomyData,
  kebabize,
  getFormattedDate,
  getDateTime,
} from './data-transform';

// CSV writing
export { write, csvParse } from './csv-writer';

// API client
export {
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
  getRoleData,
  taxonomySDKHandler,
  getAllTaxonomies,
  getAllTermsOfTaxonomy,
  getTaxonomy,
  createImportableCSV,
} from './api-client';

// Interactive prompts
export {
  startupQuestions,
  chooseOrganization,
  chooseStack,
  chooseBranch,
  chooseContentType,
  chooseInMemContentTypes,
  chooseLanguage,
  chooseFallbackOptions,
  promptContinueExport,
} from './interactive';

// Team export functions (composite functions)
export { exportTeams, getTeamsDetail, exportRoleMappings, mapRoleWithTeams } from './teams-export';
