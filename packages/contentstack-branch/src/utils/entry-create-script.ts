import { managementSDKClient } from '@contentstack/cli-utilities';
import { omit } from 'lodash';

export async function createEntries() {
  const managementAPIClient = await managementSDKClient({ host: 'dev16-api.csnonprod.com' });
  const apiKey = 'bltafe5d06b229df996';

  const baseBranchClient = managementAPIClient.stack({ api_key: apiKey, branch_uid: 'main' });

  const compareEntries = await managementAPIClient
    .stack({ api_key: apiKey, branch_uid: 'akash_base' })
    .contentType('banner')
    .entry()
    .query()
    .find();

  const compareFilteredProperties = compareEntries.items.map((entry) =>
    omit(entry, [
      'stackHeaders',
      'single_line',
      'tags',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
      'ACL',
      '_version',
      'update',
      'delete',
      'fetch',
      'publish',
      'unpublish',
      'publishRequest',
      'setWorkflowStage',
      'import',
      '_in_progress',
      'locale',
    ]),
  );

  compareFilteredProperties.forEach((entry) =>
    baseBranchClient
      .contentType(entry.content_type_uid)
      .entry()
      .create({
        entry: {
          title: entry.title,
          url: entry.urlPath,
        },
      })
      .then((res) => console.log(res))
      .catch((err) => console.log(err.errors)),
  );
}
