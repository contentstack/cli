import map from 'lodash/map';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import { ApolloClient } from '@apollo/client/core';
import { cliux as ux, ContentstackClient, FlagInput, configHandler } from '@contentstack/cli-utilities';

import { projectsQuery } from '../graphql';
import { ConfigType, LogFn } from '../types';

type CommpnOptions = {
  log: LogFn;
  managementSdk: ContentstackClient;
};

async function getOrganizations(
  options: CommpnOptions,
  skip = 0,
  organizations: Record<string, any>[] = [],
): Promise<Record<string, any>[]> {
  const { log, managementSdk } = options;
  const configOrgUid = configHandler.get('oauthOrgUid');

  try {
    if (configOrgUid) {
      const response = await managementSdk.organization(configOrgUid).fetch();
      organizations.push(...[response]);
    } else {
      const response = await managementSdk
        .organization()
        .fetchAll({ limit: 100, asc: 'name', include_count: true, skip });
      organizations.push(...response.items);

      if (organizations.length < response.count) {
        organizations = await getOrganizations(options, skip + 100, organizations);
      }
    }
  } catch (error) {
    log('Unable to fetch organizations.', 'warn');
    log(error, 'error');
    process.exit(1);
  }

  return organizations;
}

async function selectOrg(
  options: CommpnOptions & {
    flags: FlagInput;
    config: ConfigType;
  },
): Promise<void> {
  const { log, config, flags } = options;
  const organizations = await getOrganizations(options);

  if (flags.org || config.currentConfig.organizationUid) {
    config.currentConfig.organizationUid =
      find(organizations, { uid: flags.org })?.uid ||
      find(organizations, {
        uid: config.currentConfig.organizationUid,
      })?.uid;

    if (!config.currentConfig.organizationUid) {
      log('Organization UID not found!', 'warn');
    }
  }
  if (!config.currentConfig.organizationUid) {
    config.currentConfig.organizationUid = await ux
      .inquire({
        type: 'search-list',
        name: 'Organization',
        choices: organizations,
        message: 'Choose an organization',
      })
      .then((name) => (find(organizations, { name }) as Record<string, any>)?.uid);
  }
}

/**
 * @method selectProject - select projects
 *
 * @return {*}  {Promise<void>}
 * @memberof Logs
 */
async function selectProject(options: {
  log: LogFn;
  flags: FlagInput;
  config: ConfigType;
  apolloClient: ApolloClient<any>;
}): Promise<void> {
  const { log, config, flags, apolloClient } = options;
  const projects = await apolloClient
    .query({ query: projectsQuery, variables: { query: {} } })
    .then(({ data: { projects } }) => projects)
    .catch((error) => {
      log('Unable to fetch projects.!', { color: 'yellow' });
      log(error, 'error');
      process.exit(1);
    });

  const listOfProjects = map(projects.edges, ({ node: { uid, name } }) => ({
    name,
    value: name,
    uid,
  }));

  if (isEmpty(listOfProjects)) {
    log('Project not found', 'info');
    process.exit(1);
  }

  if (config.project || config.currentConfig.uid) {
    config.currentConfig.uid =
      find(listOfProjects, {
        uid: flags.project,
      })?.uid ||
      find(listOfProjects, {
        name: flags.project,
      })?.uid ||
      find(listOfProjects, {
        uid: config.currentConfig.uid,
      })?.uid;
  }

  if (!config.currentConfig.uid) {
    config.currentConfig.uid = await ux
      .inquire({
        type: 'search-list',
        name: 'Project',
        choices: listOfProjects,
        message: 'Choose a project',
      })
      .then((name) => (find(listOfProjects, { name }) as Record<string, any>)?.uid);
  }
}

function getLaunchHubUrl(): string {
  const { cma } = configHandler.get('region') || {};
  if (!cma) {
    throw new Error('Region not configured. Please set the region with command $ csdx config:set:region');
  }

  let launchHubBaseUrl = cma.replace('api', 'launch-api');

  if (launchHubBaseUrl.startsWith('http')) {
    launchHubBaseUrl = launchHubBaseUrl.split('//')[1];
  }

  launchHubBaseUrl = launchHubBaseUrl.startsWith('dev11') ? launchHubBaseUrl.replace('dev11', 'dev') : launchHubBaseUrl;
  launchHubBaseUrl = launchHubBaseUrl.endsWith('io') ? launchHubBaseUrl.replace('io', 'com') : launchHubBaseUrl;

  return `https://${launchHubBaseUrl}`;
}

export { getOrganizations, selectOrg, selectProject, getLaunchHubUrl };
