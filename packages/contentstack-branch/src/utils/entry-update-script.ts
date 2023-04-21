import { managementSDKClient } from '@contentstack/cli-utilities';
import * as contentstack from '@contentstack/management';
import { uniq, concat, omit } from 'lodash';

function converter(data) {
  let arr = [];
  for (const elm of data.entries()) {
    // @ts-ignore
    arr.push([elm[1].uid, elm[1]]);
  }
  return arr;
}

export const keysToRemove = [
  'content_type_uid',
  'uid',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'ACL',
  'stackHeaders',
  'urlPath',
  '_version',
  '_in_progress',
  'update',
  'delete',
  'fetch',
  'publish',
  'unpublish',
  'publishRequest',
  'setWorkflowStage',
  'import',
];

export function deleteUnwantedKeysFromObject(obj: any, keysToRemove: string[]) {
  const modifiedObj = omit(obj, keysToRemove);
  return modifiedObj;
}

export const updateEntriesTest = async () => {
  const stackAPIKey = 'bltafe5d06b229df996';
  const stackSDKInstance = contentstack.client({
    host: 'dev16-api.csnonprod.com',
    authtoken: 'blt155f76e5d72621cb',
  });
  const contentTypeUID = 'page';
  const baseBranch = 'shrutika_base';
  const compareBranch = 'shrutika_test';

  try {
    let compareBranchEntries = await stackSDKInstance
      .stack({ api_key: stackAPIKey, branch_uid: compareBranch })
      .contentType(contentTypeUID)
      .entry()
      .query()
      .find();

    let baseBranchEntries = await stackSDKInstance
      .stack({ api_key: stackAPIKey, branch_uid: baseBranch })
      .contentType(contentTypeUID)
      .entry()
      .query()
      .find();

    let contentType = await stackSDKInstance
      .stack({ api_key: stackAPIKey, branch_uid: compareBranch })
      .contentType(contentTypeUID)
      .fetch();

    if (contentType.options.singleton) {
      compareBranchEntries.items.map(async (el) => {
        let entryDetails: any = deleteUnwantedKeysFromObject(el, keysToRemove);
        console.log(entryDetails, baseBranchEntries.items[0].uid);

        if (baseBranchEntries.items.length) {
          let baseEntryUid = baseBranchEntries.items[0].uid;
          let entry = await stackSDKInstance
            .stack({ api_key: stackAPIKey, branch_uid: baseBranch })
            .contentType(contentTypeUID)
            .entry(baseEntryUid);
          Object.assign(entry, { ...entryDetails });
          entry.update();
        } else {
          let baseEntry = await stackSDKInstance
            .stack({ api_key: stackAPIKey, branch_uid: baseBranch })
            .contentType(contentTypeUID)
            .entry()
            .create({ entry: entryDetails });

          console.log('new entry', baseEntry);
        }
      });
    } else {
      let compareMap = new Map(converter(compareBranchEntries.items));
      let baseMap = new Map(converter(baseBranchEntries.items));

      let arr = uniq(concat(Array.from(compareMap.keys()), Array.from(baseMap.keys())));

      arr.map(async (el) => {
        let entryDetails: any = deleteUnwantedKeysFromObject(compareMap.get(el), keysToRemove);
        console.log(entryDetails);
        if (compareMap.get(el) && !baseMap.get(el)) {
          let baseEntry = await stackSDKInstance
            .stack({ api_key: stackAPIKey, branch_uid: baseBranch })
            .contentType(contentTypeUID)
            .entry()
            .create({ entry: entryDetails });

          console.log('new entry', baseEntry);
        } else if (compareMap.get(el) && baseMap.get(el)) {
          let baseEntry: any = compareMap.get(el);

          let entry = await stackSDKInstance
            .stack({ api_key: stackAPIKey, branch_uid: baseBranch })
            .contentType(contentTypeUID)
            .entry(baseEntry.uid);
          Object.assign(entry, { ...entryDetails });
          entry.update();
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
};
