/**
 * Team export utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 *
 * These are composite functions that use multiple utilities together
 * for team export functionality.
 */

import find from 'lodash/find';
import cloneDeep from 'lodash/cloneDeep';
import { cliux, log } from '@contentstack/cli-utilities';

import config from '../config';
import { write } from './csv-writer';
import { kebabize, getTeamsUserDetails } from './data-transform';
import { exportOrgTeams, getRoleData } from './api-client';
import { promptContinueExport } from './interactive';
import type {
  ManagementClient,
  OrganizationChoice,
  CleanedTeam,
  TeamUser,
  TeamCsvRow,
  StackRoleMapping,
  StackRoleMappingCsvRow,
  StackRole,
} from '../types';

/**
 * Export teams data for an organization.
 */
export async function exportTeams(
  managementAPIClient: ManagementClient,
  organization: OrganizationChoice,
  teamUid: string | undefined,
  delimiter: string,
): Promise<void> {
  const logContext = { module: 'teams-export', orgUid: organization.uid, teamUid };

  log.debug('Starting teams export', logContext);

  cliux.print(
    `info: Exporting the ${
      teamUid && organization?.name
        ? `team with uid ${teamUid} in Organisation ${organization?.name} `
        : `teams of Organisation ` + organization?.name
    }`,
    { color: 'blue' },
  );

  cliux.loader('Fetching teams...');
  const allTeamsData = await exportOrgTeams(managementAPIClient, organization);
  cliux.loader();

  if (!allTeamsData?.length) {
    log.info('No teams found', logContext);
    cliux.print(
      `info: The organization ${organization?.name} does not have any teams associated with it. Please verify and provide the correct organization name.`,
    );
    return;
  }

  log.debug(`Found ${allTeamsData.length} teams`, logContext);

  const modifiedTeam: TeamCsvRow[] = cloneDeep(allTeamsData).map((team) => {
    const csvRow: TeamCsvRow = {
      uid: team.uid,
      name: team.name,
      description: team.description,
      organizationRole: team.organizationRole,
      Total_Members: team.Total_Members,
    };
    return csvRow;
  });

  const fileName = `${kebabize(organization.name.replace(config.organizationNameRegex, ''))}_teams_export.csv`;
  log.info(`Writing teams to ${fileName}`, logContext);
  write(null, modifiedTeam, fileName, ' organization Team details', delimiter);

  // Exporting teams user data or a single team user data
  cliux.print(
    `info: Exporting the teams user data for ${teamUid ? `team ` + teamUid : `organisation ` + organization?.name}`,
    { color: 'blue' },
  );
  await getTeamsDetail(allTeamsData, organization, teamUid, delimiter);

  cliux.print(
    `info: Exporting the stack role details for  ${
      teamUid ? `team ` + teamUid : `organisation ` + organization?.name
    }`,
    { color: 'blue' },
  );

  // Exporting the stack Role data for all the teams or exporting stack role data for a single team
  await exportRoleMappings(managementAPIClient, allTeamsData, teamUid, delimiter);

  log.success('Teams export completed', logContext);
}

/**
 * Get individual team user details and write to file.
 */
export async function getTeamsDetail(
  allTeamsData: CleanedTeam[],
  organization: OrganizationChoice,
  teamUid: string | undefined,
  delimiter: string,
): Promise<void> {
  const logContext = { module: 'teams-export', action: 'team-users', teamUid };

  log.debug('Exporting team user details', logContext);

  if (!teamUid) {
    const userData = getTeamsUserDetails(allTeamsData);
    const fileName = `${kebabize(
      organization.name.replace(config.organizationNameRegex, ''),
    )}_team_User_Details_export.csv`;

    log.info(`Writing ${userData.length} team users to ${fileName}`, logContext);
    write(null, userData, fileName, 'Team User details', delimiter);
  } else {
    const team = allTeamsData.filter((t) => t.uid === teamUid)[0];

    if (!team) {
      log.debug('Team not found', { ...logContext, teamUid });
      cliux.print(`Team with UID ${teamUid} not found.`, { color: 'red' });
      return;
    }

    const teamUsers: TeamUser[] = (team.users || []).map((user) => ({
      ...user,
      'team-name': team.name,
      'team-uid': team.uid,
    }));

    // Remove unwanted properties
    teamUsers.forEach((user) => {
      delete user.active;
      delete user.orgInvitationStatus;
    });

    const fileName = `${kebabize(
      organization.name.replace(config.organizationNameRegex, ''),
    )}_team_${teamUid}_User_Details_export.csv`;

    log.info(`Writing ${teamUsers.length} users for team ${teamUid} to ${fileName}`, logContext);
    write(null, teamUsers, fileName, 'Team User details', delimiter);
  }
}

/**
 * Export role mappings of teams to CSV.
 */
export async function exportRoleMappings(
  managementAPIClient: ManagementClient,
  allTeamsData: CleanedTeam[],
  teamUid: string | undefined,
  delimiter: string,
): Promise<void> {
  const logContext = { module: 'teams-export', action: 'role-mappings', teamUid };

  log.debug('Exporting role mappings', logContext);

  const stackRoleWithTeamData: StackRoleMappingCsvRow[] = [];
  let flag = false;
  const stackNotAdmin: string[] = [];

  cliux.loader('Fetching stack role mappings...');

  if (teamUid) {
    const team = find(allTeamsData, function (teamObject) {
      return teamObject?.uid === teamUid;
    });

    for (const stack of team?.stackRoleMapping || []) {
      const roleData = await mapRoleWithTeams(managementAPIClient, stack, team?.name || '', team?.uid || '');
      stackRoleWithTeamData.push(...roleData);

      if (roleData[0]['Stack Name'] === '') {
        flag = true;
        stackNotAdmin.push(stack.stackApiKey);
      }
    }
  } else {
    for (const team of allTeamsData ?? []) {
      for (const stack of team?.stackRoleMapping ?? []) {
        const roleData = await mapRoleWithTeams(managementAPIClient, stack, team?.name, team?.uid);
        stackRoleWithTeamData.push(...roleData);

        if (roleData[0]['Stack Name'] === '') {
          flag = true;
          stackNotAdmin.push(stack.stackApiKey);
        }
      }
    }
  }

  cliux.loader();

  if (stackNotAdmin?.length) {
    log.debug('Admin access denied to some stacks', { ...logContext, stacks: stackNotAdmin });
    cliux.print(
      `warning: Admin access denied to the following stacks using the provided API keys. Please get in touch with the stack owner to request access.`,
      { color: 'yellow' },
    );
    cliux.print(`${stackNotAdmin.join(' , ')}`, { color: 'yellow' });
  }

  if (flag) {
    const shouldContinue = await promptContinueExport();
    if (!shouldContinue) {
      log.debug('User chose not to continue export', logContext);
      process.exit(1);
    }
  }

  const fileName = `${kebabize('Stack_Role_Mapping'.replace(config.organizationNameRegex, ''))}${
    teamUid ? `_${teamUid}` : ''
  }.csv`;

  log.info(`Writing ${stackRoleWithTeamData.length} role mappings to ${fileName}`, logContext);
  write(null, stackRoleWithTeamData, fileName, 'Team Stack Role details', delimiter);
}

/**
 * Stack role map with stack details.
 */
interface StackRoleMap {
  [key: string]: string | { name: string; uid: string };
}

/**
 * Map team stacks with stack role and return array of objects.
 */
export async function mapRoleWithTeams(
  managementAPIClient: ManagementClient,
  stackRoleMapping: StackRoleMapping,
  teamName: string,
  teamUid: string,
): Promise<StackRoleMappingCsvRow[]> {
  const rolesResponse = await getRoleData(managementAPIClient, stackRoleMapping.stackApiKey);
  const stackRole: StackRoleMap = {};

  rolesResponse.items?.forEach((role: StackRole) => {
    if (!Object.prototype.hasOwnProperty.call(stackRole, role?.uid)) {
      stackRole[role?.uid] = role?.name;
      if (role?.stack?.api_key) {
        stackRole[role.stack.api_key] = { name: role.stack.name, uid: role.stack.uid };
      }
    }
  });

  const stackInfo = stackRole[stackRoleMapping?.stackApiKey] as { name: string; uid: string } | undefined;

  const stackRoleMapOfTeam: StackRoleMappingCsvRow[] = stackRoleMapping?.roles.map((role) => {
    return {
      'Team Name': teamName,
      'Team Uid': teamUid,
      'Stack Name': stackInfo?.name || '',
      'Stack Uid': stackInfo?.uid || '',
      'Role Name': (stackRole[role] as string) || '',
      'Role Uid': role || '',
    };
  });

  return stackRoleMapOfTeam;
}
