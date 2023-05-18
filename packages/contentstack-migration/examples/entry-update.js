
module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const keysToRemove = [
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

  function converter(data) {
    let arr = [];
    for (const elm of data.entries()) {
      // @ts-ignore
      arr.push([elm[1].uid, elm[1]]);
    }
    return arr;
  }

  function deleteUnwantedKeysFromObject(obj, keysToRemove) {
    keysToRemove.map((key) => delete obj[key]);
    return obj;
  }

  function uniquelyConcatenateArrays(compareArr, baseArr) {
    let uniqueArray = compareArr.concat(baseArr.filter((item) => compareArr.indexOf(item) < 0));
    return uniqueArray;
  }

  let compareBranch = '';

  if (config.compare_branch) {
    compareBranch = config.compare_branch;
  }

  let compareBranchEntries = await managementAPIClient
    .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
    .contentType('migration_testing')
    .entry()
    .query()
    .find();

  let baseBranchEntries = await stackSDKInstance.contentType('migration_testing').entry().query().find();

  let contentType = await managementAPIClient
    .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
    .contentType('migration_testing')
    .fetch();

  const updateEntryTask = () => {
    return {
      title: 'Update Entries',
      successMessage: 'Entries Updated Successfully',
      failedMessage: 'Failed to update entries',
      task: async (params) => {
        try {
          if (contentType.options.singleton) {
            compareBranchEntries.items.map(async (el) => {
              let entryDetails = deleteUnwantedKeysFromObject(el, keysToRemove);

              if (baseBranchEntries.items.length) {
                let baseEntryUid = baseBranchEntries.items[0].uid;
                let entry = await stackSDKInstance.contentType('migration_testing').entry(baseEntryUid);
                Object.assign(entry, { ...entryDetails });
                entry.update();
              } else {
                await stackSDKInstance.contentType('migration_testing').entry().create({ entry: entryDetails });
              }
            });
          } else {
            let compareMap = new Map(converter(compareBranchEntries.items));
            let baseMap = new Map(converter(baseBranchEntries.items));

            let arr = uniquelyConcatenateArrays(Array.from(compareMap.keys()), Array.from(baseMap.keys()));

            arr.map(async (el) => {
              let entryDetails = deleteUnwantedKeysFromObject(compareMap.get(el), keysToRemove);

              if (compareMap.get(el) && !baseMap.get(el)) {
                await stackSDKInstance.contentType('migration_testing').entry().create({ entry: entryDetails });
              } else if (compareMap.get(el) && baseMap.get(el)) {
                let baseEntry = compareMap.get(el);

                let entry = await stackSDKInstance.contentType('migration_testing').entry(baseEntry.uid);
                Object.assign(entry, { ...entryDetails });
                entry.update();
              }
            });
          }
        } catch (error) {
          throw error;
        }
      },
    };
  };

  migration.addTask(updateEntryTask());
};