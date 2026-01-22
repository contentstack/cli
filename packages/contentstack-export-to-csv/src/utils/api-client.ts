/**
 * API client utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import find from 'lodash/find';
import { configHandler } from '@contentstack/cli-utilities';

import config from '../config';
import { wait, handleErrorMsg, handleTaxonomyErrorMsg } from './error-handler';
import type {
  ManagementClient,
  StackClient,
  OrgMap,
  StackMap,
  ContentTypeMap,
  LanguageMap,
  EnvironmentMap,
  OrgUsersResponse,
  OrgRolesResponse,
  PaginationParams,
  OrganizationChoice,
  RawTeam,
  CleanedTeam,
  TeamsResponse,
  StackRolesResponse,
  TaxonomyPayload,
  TaxonomiesResponse,
  TermsResponse,
  Taxonomy,
  Term,
  TaxonomyQueryParams,
  EntriesResponse,
  UserResponse,
  ImportableCsvResult,
} from '../types';

// ============================================================================
// Organization APIs
// ============================================================================

/**
 * Get all organizations the user has access to.
 */
export async function getOrganizations(managementAPIClient: ManagementClient): Promise<OrgMap> {
  try {
    return await getOrganizationList(managementAPIClient, { skip: 0, page: 1, limit: 100 }, []);
  } catch (error) {
    throw error;
  }
}

/**
 * Organization item structure from API.
 */
interface OrganizationItem {
  uid: string;
  name: string;
  items?: OrganizationItem[];
}

/**
 * Get organization list with pagination.
 */
async function getOrganizationList(
  managementAPIClient: ManagementClient,
  params: PaginationParams,
  result: OrganizationItem[] = [],
): Promise<OrgMap> {
  let organizations: OrganizationItem & { items?: OrganizationItem[] };
  const configOrgUid = configHandler.get('oauthOrgUid') as string | undefined;

  if (configOrgUid) {
    organizations = await managementAPIClient.organization(configOrgUid).fetch() as unknown as OrganizationItem;
    result = result.concat([organizations]);
  } else {
    const response = await managementAPIClient.organization().fetchAll({ limit: 100 }) as unknown as { items: OrganizationItem[] };
    organizations = response as unknown as OrganizationItem & { items?: OrganizationItem[] };
    result = result.concat(response.items);
  }

  if (!organizations.items || (organizations.items && organizations.items.length < params.limit)) {
    const orgMap: OrgMap = {};
    for (const org of result) {
      orgMap[org.name] = org.uid;
    }
    return orgMap;
  } else {
    params.skip = params.page * params.limit;
    params.page++;
    await wait(200);
    return getOrganizationList(managementAPIClient, params, result);
  }
}

/**
 * Organization with roles structure from getUser API.
 */
interface OrgWithRoles {
  uid: string;
  name: string;
  is_owner?: boolean;
  org_roles?: Array<{ admin?: boolean }>;
}

/**
 * Get organizations where user is admin.
 */
export async function getOrganizationsWhereUserIsAdmin(managementAPIClient: ManagementClient): Promise<OrgMap> {
  try {
    const result: OrgMap = {};
    const configOrgUid = configHandler.get('oauthOrgUid') as string | undefined;

    if (configOrgUid) {
      const response = await managementAPIClient.organization(configOrgUid).fetch() as unknown as OrganizationItem;
      result[response.name] = response.uid;
    } else {
      const response = await managementAPIClient.getUser({ include_orgs_roles: true }) as unknown as { organizations: OrgWithRoles[] };
      const organizations = response.organizations.filter((org) => {
        if (org.org_roles) {
          const org_role = org.org_roles.shift();
          return org_role?.admin;
        }
        return org.is_owner === true;
      });

      organizations.forEach((org) => {
        result[org.name] = org.uid;
      });
    }

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Get organization users.
 */
export function getOrgUsers(managementAPIClient: ManagementClient, orgUid: string): Promise<OrgUsersResponse> {
  return new Promise((resolve, reject) => {
    managementAPIClient
      .getUser({ include_orgs_roles: true })
      .then(async (response: unknown) => {
        const userResponse = response as UserResponse;
        const organization = userResponse.organizations.filter((org) => org.uid === orgUid).pop();

        if (!organization) {
          return reject(new Error('Org UID not found.'));
        }

        if (organization.is_owner === true) {
          return managementAPIClient
            .organization(organization.uid)
            .getInvitations()
            .then((data: unknown) => {
              resolve(data as OrgUsersResponse);
            })
            .catch(reject);
        }

        if (!organization.getInvitations && !find(organization.org_roles, 'admin')) {
          return reject(new Error(config.adminError));
        }

        try {
          const users = await getUsers(managementAPIClient, { uid: organization.uid }, { skip: 0, page: 1, limit: 100 });
          return resolve({ items: users || [] });
        } catch (error) {
          return reject(error);
        }
      })
      .catch((error: unknown) => reject(error));
  });
}

/**
 * Get users with pagination.
 */
async function getUsers(
  managementAPIClient: ManagementClient,
  organization: { uid: string },
  params: PaginationParams,
  result: OrgUsersResponse['items'] = [],
): Promise<OrgUsersResponse['items']> {
  try {
    const users = await managementAPIClient.organization(organization.uid).getInvitations(params) as unknown as OrgUsersResponse;

    if (!users.items || (users.items && !users.items.length)) {
      return result;
    } else {
      result = result.concat(users.items);
      params.skip = params.page * params.limit;
      params.page++;
      await wait(200);
      return getUsers(managementAPIClient, organization, params, result);
    }
  } catch {
    return result;
  }
}

/**
 * Get organization roles.
 */
export function getOrgRoles(managementAPIClient: ManagementClient, orgUid: string): Promise<OrgRolesResponse> {
  return new Promise((resolve, reject) => {
    managementAPIClient
      .getUser({ include_orgs_roles: true })
      .then((response: unknown) => {
        const userResponse = response as UserResponse;
        const organization = userResponse.organizations.filter((org) => org.uid === orgUid).pop();

        if (!organization) {
          return reject(new Error('Org UID not found.'));
        }

        if (organization.is_owner === true) {
          return managementAPIClient
            .organization(organization.uid)
            .roles()
            .then((roles: unknown) => {
              resolve(roles as OrgRolesResponse);
            })
            .catch(reject);
        }

        if (!organization.roles && !find(organization.org_roles, 'admin')) {
          return reject(new Error(config.adminError));
        }

        managementAPIClient
          .organization(organization.uid)
          .roles()
          .then((roles: unknown) => {
            resolve(roles as OrgRolesResponse);
          })
          .catch(reject);
      })
      .catch((error: unknown) => reject(error));
  });
}

// ============================================================================
// Stack APIs
// ============================================================================

/**
 * Stack item structure from API.
 */
interface StackItem {
  name: string;
  api_key: string;
}

/**
 * Get all stacks in an organization.
 */
export function getStacks(managementAPIClient: ManagementClient, orgUid: string): Promise<StackMap> {
  return new Promise((resolve, reject) => {
    const result: StackMap = {};

    managementAPIClient
      .stack({ organization_uid: orgUid })
      .query({ query: {} })
      .find()
      .then((stacks: unknown) => {
        const stacksResponse = stacks as { items: StackItem[] };
        stacksResponse.items.forEach((stack) => {
          result[stack.name] = stack.api_key;
        });
        resolve(result);
      })
      .catch((error: unknown) => {
        reject(error);
      });
  });
}

// ============================================================================
// Content Type APIs
// ============================================================================

/**
 * Get content type count.
 */
export function getContentTypeCount(stackAPIClient: StackClient): Promise<number> {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType()
      .query()
      .count()
      .then((contentTypes: unknown) => {
        const response = contentTypes as { content_types: number };
        resolve(response.content_types);
      })
      .catch((error: unknown) => reject(error));
  });
}

/**
 * Content type item structure from API.
 */
interface ContentTypeItem {
  uid: string;
  title: string;
}

/**
 * Get content types with pagination.
 */
export function getContentTypes(stackAPIClient: StackClient, skip: number): Promise<ContentTypeMap> {
  return new Promise((resolve, reject) => {
    const result: ContentTypeMap = {};

    stackAPIClient
      .contentType()
      .query({ skip: skip * 100, include_branch: true })
      .find()
      .then((contentTypes: unknown) => {
        const response = contentTypes as { items: ContentTypeItem[] };
        response.items.forEach((contentType) => {
          result[contentType.title] = contentType.uid;
        });
        resolve(result);
      })
      .catch((error: unknown) => {
        reject(error);
      });
  });
}

// ============================================================================
// Language/Locale APIs
// ============================================================================

/**
 * Language item structure from API.
 */
interface LanguageItem {
  name: string;
  code: string;
}

/**
 * Get all languages/locales for a stack.
 */
export function getLanguages(stackAPIClient: StackClient): Promise<LanguageMap> {
  return new Promise((resolve, reject) => {
    const result: LanguageMap = {};

    stackAPIClient
      .locale()
      .query()
      .find()
      .then((languages: unknown) => {
        const response = languages as { items: LanguageItem[] };
        response.items.forEach((language) => {
          result[language.name] = language.code;
        });
        resolve(result);
      })
      .catch((error: unknown) => reject(error));
  });
}

// ============================================================================
// Entry APIs
// ============================================================================

/**
 * Get entry count for a content type.
 */
export function getEntriesCount(stackAPIClient: StackClient, contentType: string, language: string): Promise<number> {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType(contentType)
      .entry()
      .query({ include_publish_details: true, locale: language })
      .count()
      .then((entriesData: unknown) => {
        const response = entriesData as { entries: number };
        resolve(response.entries);
      })
      .catch((error: unknown) => {
        const { formatError } = require('./error-handler');
        reject(formatError(error));
      });
  });
}

/**
 * Get entries with pagination.
 */
export function getEntries(
  stackAPIClient: StackClient,
  contentType: string,
  language: string,
  skip: number,
  limit: number,
): Promise<EntriesResponse> {
  return new Promise((resolve, reject) => {
    stackAPIClient
      .contentType(contentType)
      .entry()
      .query({
        include_publish_details: true,
        locale: language,
        skip: skip * 100,
        limit: limit,
        include_workflow: true,
      })
      .find()
      .then((entries: unknown) => resolve(entries as EntriesResponse))
      .catch((error: unknown) => reject(error));
  });
}

// ============================================================================
// Environment APIs
// ============================================================================

/**
 * Environment item structure from API.
 */
interface EnvironmentItem {
  uid: string;
  name: string;
}

/**
 * Get all environments for a stack.
 */
export function getEnvironments(stackAPIClient: StackClient): Promise<EnvironmentMap> {
  const result: EnvironmentMap = {};

  return stackAPIClient
    .environment()
    .query()
    .find()
    .then((environments: unknown) => {
      const response = environments as { items: EnvironmentItem[] };
      response.items.forEach((env) => {
        result[env.uid] = env.name;
      });
      return result;
    });
}

// ============================================================================
// Team APIs
// ============================================================================

/**
 * Get all teams in an organization.
 */
export async function getAllTeams(
  managementAPIClient: ManagementClient,
  org: OrganizationChoice,
  queryParam: Record<string, unknown> = {},
): Promise<TeamsResponse> {
  try {
    return await managementAPIClient.organization(org.uid).teams().fetchAll(queryParam) as unknown as TeamsResponse;
  } catch (error) {
    handleErrorMsg(error);
  }
}

/**
 * Export all organization teams with pagination.
 */
export async function exportOrgTeams(
  managementAPIClient: ManagementClient,
  org: OrganizationChoice,
): Promise<CleanedTeam[]> {
  const { cleanTeamsData } = await import('./data-transform');

  let allTeamsInOrg: RawTeam[] = [];
  let skip = 0;
  const limit = config?.limit || 100;

  do {
    const data = await getAllTeams(managementAPIClient, org, {
      skip: skip,
      limit: limit,
      includeUserDetails: true,
    });
    skip += limit;
    allTeamsInOrg.push(...data.items);
    if (skip >= (data.count || 0)) break;
  } while (true);

  const cleanedTeams = await cleanTeamsData(allTeamsInOrg, managementAPIClient, org);
  return cleanedTeams;
}

/**
 * Get role data for a stack.
 */
export async function getRoleData(managementAPIClient: ManagementClient, stackApiKey: string): Promise<StackRolesResponse> {
  try {
    return await managementAPIClient.stack({ api_key: stackApiKey }).role().fetchAll() as unknown as StackRolesResponse;
  } catch {
    return { items: [] };
  }
}

// ============================================================================
// Taxonomy APIs
// ============================================================================

/**
 * Taxonomy & term SDK handler.
 */
export async function taxonomySDKHandler(payload: TaxonomyPayload, skip?: number): Promise<TaxonomiesResponse | TermsResponse | Taxonomy | string> {
  const { stackAPIClient, taxonomyUID, type, format, locale, branch, include_fallback, fallback_locale } = payload;

  const queryParams: TaxonomyQueryParams = { include_count: true, limit: payload.limit };
  if (skip !== undefined && skip >= 0) queryParams.skip = skip || 0;

  // Add locale and branch parameters if provided
  if (locale) queryParams.locale = locale;
  if (branch) queryParams.branch = branch;
  if (include_fallback !== undefined) queryParams.include_fallback = include_fallback;
  if (fallback_locale) queryParams.fallback_locale = fallback_locale;

  switch (type) {
    case 'taxonomies':
      return await stackAPIClient
        .taxonomy()
        .query(queryParams)
        .find()
        .then((data: unknown) => data as TaxonomiesResponse)
        .catch((err: unknown) => handleTaxonomyErrorMsg(err));

    case 'taxonomy':
      return await stackAPIClient
        .taxonomy(taxonomyUID!)
        .fetch()
        .then((data: unknown) => data as Taxonomy)
        .catch((err: unknown) => handleTaxonomyErrorMsg(err));

    case 'terms':
      queryParams.depth = 0;
      return await stackAPIClient
        .taxonomy(taxonomyUID!)
        .terms()
        .query(queryParams)
        .find()
        .then((data: unknown) => data as TermsResponse)
        .catch((err: unknown) => handleTaxonomyErrorMsg(err));

    case 'export-taxonomies':
      const exportParams: Record<string, unknown> = { format };
      if (locale) exportParams.locale = locale;
      if (branch) exportParams.branch = branch;
      if (include_fallback !== undefined) exportParams.include_fallback = include_fallback;
      if (fallback_locale) exportParams.fallback_locale = fallback_locale;

      return await stackAPIClient
        .taxonomy(taxonomyUID!)
        .export(exportParams)
        .then((data: unknown) => data as string)
        .catch((err: unknown) => handleTaxonomyErrorMsg(err));

    default:
      handleTaxonomyErrorMsg({ errorMessage: 'Invalid module!' });
  }
}

/**
 * Get all taxonomies in a stack.
 */
export async function getAllTaxonomies(payload: TaxonomyPayload, skip = 0, taxonomies: Taxonomy[] = []): Promise<Taxonomy[]> {
  payload.type = 'taxonomies';
  const response = await taxonomySDKHandler(payload, skip) as TaxonomiesResponse;

  if (response.items) {
    skip += payload.limit;
    taxonomies.push(...response.items);

    if (skip >= response.count) {
      return taxonomies;
    } else {
      return getAllTaxonomies(payload, skip, taxonomies);
    }
  }

  return taxonomies;
}

/**
 * Get all terms for a taxonomy.
 */
export async function getAllTermsOfTaxonomy(payload: TaxonomyPayload, skip = 0, terms: Term[] = []): Promise<Term[]> {
  payload.type = 'terms';
  const response = await taxonomySDKHandler(payload, skip) as TermsResponse;

  if (response.items) {
    skip += payload.limit;
    terms.push(...response.items);

    if (skip >= response.count) {
      return terms;
    } else {
      return getAllTermsOfTaxonomy(payload, skip, terms);
    }
  }

  return terms;
}

/**
 * Get a single taxonomy by UID.
 */
export async function getTaxonomy(payload: TaxonomyPayload): Promise<Taxonomy> {
  payload.type = 'taxonomy';
  const resp = await taxonomySDKHandler(payload);
  return resp as Taxonomy;
}

/**
 * Generate importable CSV data for taxonomies.
 */
export async function createImportableCSV(
  payload: TaxonomyPayload,
  taxonomies: Taxonomy[],
): Promise<ImportableCsvResult> {
  const { csvParse } = await import('./csv-writer');

  const taxonomiesData: string[][] = [];
  const headers: string[] = [];

  payload.type = 'export-taxonomies';
  payload.format = 'csv';

  for (const taxonomy of taxonomies) {
    if (taxonomy?.uid) {
      payload.taxonomyUID = taxonomy.uid;
      const data = await taxonomySDKHandler(payload) as string;
      const parsedTaxonomies = await csvParse(data, headers);
      taxonomiesData.push(...parsedTaxonomies);
    }
  }

  return { taxonomiesData, headers };
}
