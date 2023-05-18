import find from 'lodash/find';
import { cliux as ux, ContentstackClient, FlagInput } from '@contentstack/cli-utilities';

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
  const response = await managementSdk
    ?.organization()
    .fetchAll({ limit: 100, asc: 'name', include_count: true, skip: skip })
    .catch((error) => {
      log('Unable to fetch organizations.', 'warn');
      log(error, 'error');
      process.exit(1);
    });

  if (response) {
    organizations = organizations.concat(response?.items as any);
    if (organizations.length < response.count) {
      organizations = await getOrganizations(options, skip + 100);
    }
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

export { getOrganizations, selectOrg };
