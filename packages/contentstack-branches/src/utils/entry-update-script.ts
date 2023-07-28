export function entryUpdateScript(contentType) {
  return `
  module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config, branch, apiKey }) => {
    const keysToRemove = [
      'content_type_uid',
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
  
    let compareBranch = config['compare-branch'];
  
    function converter(data) {
      let arr = [];
      for (const elm of data.entries()) {
        // @ts-ignore
        arr.push([elm[1].title, elm[1]]);
      }
      return arr;
    }
  
    function deleteUnwantedKeysFromObject(obj, keysToRemove) {
      if(obj){
        keysToRemove.map((key) => delete obj[key]);
        return obj;
      }
    }
  
    function uniquelyConcatenateArrays(compareArr, baseArr) {
      let uniqueArray = compareArr.concat(baseArr.filter((item) => compareArr.indexOf(item) < 0));
      return uniqueArray;
    }
  
    function getValueByPath(obj, path) {
      return path.split('[').reduce((o, key) => o && o[key.replace(/\]$/, '')], obj);
    }
  
    function updateValueByPath(obj, path, newValue) {
      path.split('[').reduce((o, key, index, arr) => {
        if (index === arr.length - 1) {
          o[key.replace(/\]$/, '')][0].uid = newValue;
        } else {
          return o[key.replace(/\]$/, '')];
        }
      }, obj);
    }

    const findReference = function (schema, path, flag) {
      let references = [];
  
      for (const i in schema) {
        const currentPath = path ? path + '[' + schema[i].uid : schema[i].uid;
        if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
          references = references.concat(findReference(schema[i].schema, currentPath, flag));
        } else if (schema[i].data_type === 'blocks') {
          for (const block in schema[i].blocks) {
            references = references.concat(
              findReference(
                schema[i].blocks[block].schema,
                currentPath + '[' + block + '][' + schema[i].blocks[block].uid + ']',
                flag,
              ),
            );
          }
        } else if (schema[i].data_type === 'reference') {
          flag.references = true;
          references.push(currentPath);
        }
      }
  
      return references;
    };

    const updateEntryTask = () => {
      return {
        title: 'Update Entries',
        successMessage: 'Entries Updated Successfully',
        failedMessage: 'Failed to update entries',
        task: async () => {
          let compareBranchEntries = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
          .contentType('${contentType}')
          .entry()
          .query()
          .find();
  
        let baseBranchEntries = await stackSDKInstance.contentType('${contentType}').entry().query().find();
  
        let contentType = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
          .contentType('${contentType}')
          .fetch();

          let flag = {
            references: false
          };
  
          const references = await findReference(contentType.schema, '', flag);
  
          async function updateEntry(entry, entryDetails) {
            Object.assign(entry, { ...entryDetails });
            await entry.update();
          }

          async function updateReferences(entryDetails, baseEntry, references) {
            for (let i in references) {
              let compareEntryRef = getValueByPath(entryDetails, references[i]);
              let baseEntryRef = getValueByPath(baseEntry, references[i]);
  
              if (compareEntryRef.length > 0 && baseEntryRef.length >= 0) {
                let compareRefEntry = await managementAPIClient
                  .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
                  .contentType(compareEntryRef[0]._content_type_uid)
                  .entry(compareEntryRef[0].uid)
                  .fetch();
                let baseRefEntry = await stackSDKInstance
                  .contentType(compareEntryRef[0]._content_type_uid)
                  .entry()
                  .query({ query: { title: compareRefEntry.title } })
                  .find();
  
                updateValueByPath(entryDetails, references[i], baseRefEntry.items[0].uid);
              }
            }
          }

          try {
            if (contentType.options.singleton) {
              compareBranchEntries.items.map(async (el) => {
                let entryDetails = deleteUnwantedKeysFromObject(el, keysToRemove);
  
                if (baseBranchEntries.items.length) {
                  let baseEntryUid = baseBranchEntries.items[0].uid;
                  let entry = await stackSDKInstance.contentType('${contentType}').entry(baseEntryUid);
                  
                  if (flag.references) {
                    await updateReferences(entryDetails, baseBranchEntries.items[0], references);
                  }
  
                  await updateEntry(entry, entryDetails);
                } else {
                  let createdEntry = await stackSDKInstance.contentType('${contentType}').entry().create({ entry: entryDetails });
                
                  if (flag.references) {
                    await updateReferences(entryDetails, createdEntry, references);
                  }
  
                  await updateEntry(createdEntry, entryDetails);
                }
              });
            } else {
              let compareMap = new Map(converter(compareBranchEntries.items));
              let baseMap = new Map(converter(baseBranchEntries.items));
  
              let arr = uniquelyConcatenateArrays(Array.from(compareMap.keys()), Array.from(baseMap.keys()));
  
              arr.map(async (el) => {
                let entryDetails = deleteUnwantedKeysFromObject(compareMap.get(el), keysToRemove);
  
                if (compareMap.get(el) && !baseMap.get(el)) {
                  let createdEntry = await stackSDKInstance.contentType('${contentType}').entry().create({ entry: entryDetails });
                
                  if (flag.references) {
                    await updateReferences(entryDetails, createdEntry, references);
                  }
  
                  await updateEntry(createdEntry, entryDetails);
                } else if (compareMap.get(el) && baseMap.get(el)) {
                  let baseEntry = baseMap.get(el);
                  let entry = await stackSDKInstance.contentType('${contentType}').entry(baseEntry.uid);
                  
                  if (flag.references) {
                    await updateReferences(entryDetails, baseEntry, references);
                  }

                  await updateEntry(entry, entryDetails);
                }
              });
            }
          } catch (error) {
            throw error;
          }
        },
      };
    };
  
    if (compareBranch && branch.length !== 0 && apiKey.length !== 0) {
      migration.addTask(updateEntryTask());
    } else {
      if (apiKey.length === 0) {
        console.error('Please provide api key using --stack-api-key flag');
      }
      if (!compareBranch) {
        console.error('Please provide compare branch through --config compare-branch:<value> flag');
      }
      if (branch.length === 0) {
        console.error('Please provide branch name through --branch flag');
      }
    }
  };`;
}
