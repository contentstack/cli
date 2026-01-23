/**
 * Data transformation utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import omit from 'lodash/omit';
import type {
  ManagementClient,
  RawEntry,
  FlattenedEntryRow,
  OrgUser,
  OrgUsersResponse,
  OrgRolesResponse,
  UserMap,
  RoleMap,
  OrgUserCsvRow,
  RawTeam,
  CleanedTeam,
  TeamUser,
  Taxonomy,
  TaxonomyCsvRow,
  Term,
  TermCsvRow,
  EnvironmentMap,
  OrganizationChoice,
  OrgRoleMap,
} from '../types';

// ============================================================================
// Core Transformation Functions
// ============================================================================

/**
 * Flatten a nested object into a single-level object.
 * Arrays are flattened with bracket notation (e.g., "field[0]").
 *
 * @see https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects
 */
export function flatten(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  function recurse(cur: unknown, prop: string): void {
    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      const l = cur.length;
      for (let i = 0; i < l; i++) {
        recurse(cur[i], prop + '[' + i + ']');
      }
      if (l === 0) {
        result[prop] = [];
      }
    } else {
      let isEmpty = true;
      for (const p in cur as Record<string, unknown>) {
        isEmpty = false;
        recurse((cur as Record<string, unknown>)[p], prop ? prop + '.' + p : p);
      }
      if (isEmpty && prop) {
        result[prop] = {};
      }
    }
  }

  recurse(data, '');
  return result;
}

/**
 * Sanitize data against CSV injection attacks.
 * Prefixes potentially dangerous characters with a quote.
 * Also converts objects/arrays to JSON strings.
 */
export function sanitizeData<T extends Record<string, unknown>>(flatData: T): T {
  // sanitize against CSV Injections
  const CSVRegex = /^[\\+\\=@\\-]/;

  for (const key in flatData) {
    const value = flatData[key];
    if (typeof value === 'string' && value.match(CSVRegex)) {
      (flatData as Record<string, unknown>)[key] = `"'${value.replace(/"/g, '""')}"`;
    } else if (typeof value === 'object' && value !== null) {
      // convert any objects or arrays to string
      // to store this data correctly in csv
      (flatData as Record<string, unknown>)[key] = JSON.stringify(value);
    }
  }
  return flatData;
}

// ============================================================================
// Entry Transformation Functions
// ============================================================================

/**
 * Clean and format entries for CSV export.
 */
export function cleanEntries(
  entries: RawEntry[],
  language: string,
  environments: EnvironmentMap,
  contentTypeUid: string,
): FlattenedEntryRow[] {
  const filteredEntries = entries.filter((entry) => {
    return entry.locale === language;
  });

  return filteredEntries.map((entry) => {
    let workflow = '';
    const envArr: string[] = [];

    if (entry.publish_details?.length) {
      entry.publish_details.forEach((env) => {
        envArr.push(JSON.stringify([environments[env.environment], env.locale, env.time]));
      });
    }

    // Create a mutable copy for transformation
    const mutableEntry: Record<string, unknown> = { ...entry };

    delete mutableEntry.publish_details;
    delete mutableEntry.setWorkflowStage;

    if ('_workflow' in mutableEntry) {
      const workflowData = mutableEntry._workflow as { name?: string } | undefined;
      if (workflowData?.name) {
        workflow = workflowData.name;
        delete mutableEntry._workflow;
      }
    }

    let flatEntry = flatten(mutableEntry);
    flatEntry = sanitizeData(flatEntry as Record<string, unknown>);
    flatEntry.publish_details = envArr;
    flatEntry._workflow = workflow;
    flatEntry.ACL = JSON.stringify({}); // setting ACL to empty obj
    flatEntry.content_type_uid = contentTypeUid; // content_type_uid is being returned as 'uid' from the sdk for some reason

    // entry['url'] might also be wrong
    delete flatEntry.stackHeaders;
    delete flatEntry.update;
    delete flatEntry.delete;
    delete flatEntry.fetch;
    delete flatEntry.publish;
    delete flatEntry.unpublish;
    delete flatEntry.import;
    delete flatEntry.publishRequest;

    return flatEntry as unknown as FlattenedEntryRow;
  });
}

// ============================================================================
// Organization User Transformation Functions
// ============================================================================

/**
 * Map user UIDs to emails.
 */
export function getMappedUsers(users: OrgUsersResponse): UserMap {
  const mappedUsers: UserMap = {};
  users.items.forEach((user) => {
    mappedUsers[user.user_uid] = user.email;
  });
  mappedUsers['System'] = 'System';
  return mappedUsers;
}

/**
 * Map role UIDs to names.
 */
export function getMappedRoles(roles: OrgRolesResponse): RoleMap {
  const mappedRoles: RoleMap = {};
  roles.items.forEach((role) => {
    mappedRoles[role.uid] = role.name;
  });
  return mappedRoles;
}

/**
 * Determine a user's organization role.
 */
export function determineUserOrgRole(user: OrgUser, roles: RoleMap): string {
  let roleName = 'No Role';
  const roleUids = user.org_roles ? [...user.org_roles] : [];

  if (roleUids.length > 0) {
    const roleUid = roleUids.shift()!;
    roleName = roles[roleUid];
  }

  if (user.is_owner) {
    roleName = 'Owner';
  }

  return roleName;
}

/**
 * Clean and format organization users for CSV export.
 */
export function cleanOrgUsers(
  orgUsers: OrgUsersResponse,
  mappedUsers: UserMap,
  mappedRoles: RoleMap,
): OrgUserCsvRow[] {
  const userList: OrgUserCsvRow[] = [];

  orgUsers.items.forEach((user) => {
    let invitedBy: string;

    try {
      invitedBy = mappedUsers[user.invited_by] || 'System';
    } catch {
      invitedBy = 'System';
    }

    const formattedUser: OrgUserCsvRow = {
      'Email': user.email,
      'User UID': user.user_uid,
      'Organization Role': determineUserOrgRole(user, mappedRoles),
      'Status': user.status,
      'Invited By': invitedBy,
      'Created Time': getFormattedDate(user.created_at),
      'Updated Time': getFormattedDate(user.updated_at),
    };

    userList.push(formattedUser);
  });

  return userList;
}

// ============================================================================
// Team Transformation Functions
// ============================================================================

/**
 * Removes unnecessary fields from team data and assigns org level roles.
 */
export async function cleanTeamsData(
  data: RawTeam[],
  managementAPIClient: ManagementClient,
  org: OrganizationChoice,
): Promise<CleanedTeam[]> {
  const roleMap = await getOrgRolesForTeams(managementAPIClient, org);

  const fieldToBeDeleted: (keyof RawTeam)[] = [
    '_id',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    '__v',
    'createdByUserName',
    'updatedByUserName',
    'organizationUid',
    'urlPath',
    'update',
    'delete',
    'fetch',
    'stackRoleMappings',
    'teamUsers',
  ];

  if (data?.length) {
    return data.map((team) => {
      const cleanedTeam = omit(team, fieldToBeDeleted) as Partial<CleanedTeam> & { organizationRole: string };

      cleanedTeam.organizationRole = team.organizationRole === roleMap.member ? 'member' : 'admin';

      if (!Object.prototype.hasOwnProperty.call(cleanedTeam, 'description')) {
        cleanedTeam.description = '';
      }
      cleanedTeam.Total_Members = team.users?.length || 0;

      return cleanedTeam as CleanedTeam;
    });
  } else {
    return [];
  }
}

/**
 * Get all org level roles for teams.
 */
async function getOrgRolesForTeams(
  managementAPIClient: ManagementClient,
  org: OrganizationChoice,
): Promise<OrgRoleMap> {
  const roleMap: OrgRoleMap = {}; // for org level there are two roles only admin and member

  // SDK call to get the role UIDs
  try {
    const roles = await managementAPIClient.organization(org.uid).roles() as unknown as { items: Array<{ name: string; uid: string }> };
    roles.items.forEach((item) => {
      if (item.name === 'member' || item.name === 'admin') {
        roleMap[item.name] = item.uid;
      }
    });
  } catch (err) {
    // Import handleErrorMsg here to avoid circular dependency
    const { handleErrorMsg } = await import('./error-handler');
    handleErrorMsg(err);
  }

  return roleMap;
}

/**
 * Get team user details from all teams.
 */
export function getTeamsUserDetails(teams: CleanedTeam[]): TeamUser[] {
  const allTeamUsers: TeamUser[] = [];

  teams.forEach((team) => {
    if (team.users?.length) {
      team.users.forEach((user) => {
        const userWithTeam: TeamUser = {
          ...user,
          'team-name': team.name,
          'team-uid': team.uid,
        };
        delete userWithTeam.active;
        delete userWithTeam.orgInvitationStatus;
        allTeamUsers.push(userWithTeam);
      });
    }
  });

  return allTeamUsers;
}

// ============================================================================
// Taxonomy Transformation Functions
// ============================================================================

/**
 * Change taxonomies data in required CSV headers format.
 */
export function formatTaxonomiesData(taxonomies: Taxonomy[]): TaxonomyCsvRow[] | undefined {
  if (taxonomies?.length) {
    const formattedTaxonomies = taxonomies.map((taxonomy) => {
      return sanitizeData({
        'Taxonomy UID': taxonomy.uid,
        Name: taxonomy.name,
        Description: taxonomy.description || '',
      });
    });
    return formattedTaxonomies;
  }
}

/**
 * Modify the linked taxonomy data's terms in required CSV headers format.
 */
export function formatTermsOfTaxonomyData(terms: Term[], taxonomyUID: string): TermCsvRow[] | undefined {
  if (terms?.length) {
    const formattedTerms = terms.map((term) => {
      return sanitizeData({
        'Taxonomy UID': taxonomyUID,
        UID: term.uid,
        Name: term.name,
        'Parent UID': term.parent_uid,
        Depth: term.depth,
      }) as TermCsvRow;
    });
    return formattedTerms;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert string to kebab-case.
 */
export function kebabize(str: string): string {
  return str
    .split(' ')
    .map((word) => word.toLowerCase())
    .join('-');
}

/**
 * Get formatted date string (MM/DD/YYYY).
 */
export function getFormattedDate(date: Date | string): string {
  let dateObj: Date;

  if (!(date instanceof Date)) {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  const year = dateObj.getFullYear();
  const month = (1 + dateObj.getMonth()).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');

  return month + '/' + day + '/' + year;
}

/**
 * Get date-time string for file naming.
 */
export function getDateTime(): string {
  const date = new Date();
  const dateTime = date.toLocaleString().split(',');
  dateTime[0] = dateTime[0].split('/').join('-');
  dateTime[1] = dateTime[1].trim(); // trim the space before time
  dateTime[1] = dateTime[1].split(' ').join('');
  return dateTime.join('_');
}
