export function entryCreateUpdateScript(contentType) {
  return `
  const fs = require('fs');
  const path = require('path');
  const { marked } = require('marked');
  const has = require('lodash/has');
  const isArray = require('lodash/isArray');
  const isObject = require('lodash/isObject');
  const omit = require('lodash/omit');
  const compact = require('lodash/compact')
  const isPlainObject = require('lodash/isPlainObject');
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
    let filePath = config['file-path'] || process.cwd();
    let assetDirPath = path.resolve(filePath, 'assets');
    let assetDetails = [];
    let newAssetDetails = [];
    let downloadedAssets = [];
    let assetUIDMapper = {};
    let assetUrlMapper = {};
    let assetRefPath = {};
    let parent=[];
  
    function converter(data) {
      let arr = [];
      for (const elm of data) {
        // @ts-ignore
        arr.push([elm.title, elm]);
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
          o[key.replace(/]$/, '')][0].uid = newValue;
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

    const findAssets = function (schema, entry) {
      for (const i in schema) {
        if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
          parent.push(schema[i].uid);
          findAssets(schema[i].schema, entry);
          parent.pop();
        }
        if (schema[i].data_type === 'blocks') {
          for (const j = 0; j < schema[i].blocks; j++) {
            {
              if (schema[i].blocks[j].schema) {
                parent.push(schema[i].uid);
                parent.push(j);
                parent.push(schema[i].blocks[j].uid);
                findAssets(schema[i].blocks[j].schema, entry);
                parent.pop();
                parent.pop();
                parent.pop();
              }
            }
          }
        }
        if (schema[i].data_type === 'json' && schema[i].field_metadata.rich_text_type) {
          parent.push(schema[i].uid);
          findAssetIdsFromJsonRte(entry, schema);
          parent.pop();
        }
        if (
          schema[i].data_type === 'text' &&
          schema[i].field_metadata &&
          (schema[i].field_metadata.markdown || schema[i].field_metadata.rich_text_type)
        ) {
          parent.push(schema[i].uid);
          findFileUrls(schema[i], entry);
          if (schema[i].field_metadata.rich_text_type) {
            findAssetIdsFromHtmlRte(entry, schema[i]);
          }
          parent.pop();
        }
        if (schema[i].data_type === 'file') {
          parent.push(schema[i].uid);
          let updatedEntry = entry;
          for (let i = 0; i < parent.length; i++) {
            updatedEntry = updatedEntry[parent[i]];
          }
          const imgDetails = updatedEntry;
          if (schema[i].multiple) {
            if (imgDetails && imgDetails.length) {
              imgDetails.forEach((img) => {
                const obj = {
                  uid: img.uid,
                  parent_uid: img.parent_uid,
                  description: img.description,
                  title: img.title,
                  filename: img.filename,
                  url: img.url,
                };
                assetDetails.push(obj);
              });
            }
          } else {
            if (imgDetails) {
              const obj = {
                uid: imgDetails.uid,
                parent_uid: imgDetails.parent_uid,
                description: imgDetails.description,
                title: imgDetails.title,
                filename: imgDetails.filename,
                url: imgDetails.url,
              };
              assetDetails.push(obj);
            }
          }
          parent.pop();
        }
      }
    };
  
    function findAssetIdsFromHtmlRte(entryObj, ctSchema) {
      const regex = /<img asset_uid=\\"([^"]+)\\"/g;
      let match;
      const entry = JSON.stringify(entryObj);
      while ((match = regex.exec(entry)) !== null) {
        //insert into asset details
        assetDetails.push({uid: match[1]});
      }
    }
  
    function findFileUrls(schema, _entry) {
      let markdownRegEx;
      let markdownMatch;
      let text;
      // Regex to detect v3 asset uri patterns
      if (schema && schema.field_metadata && schema.field_metadata.markdown) {
        text = marked(JSON.stringify(_entry));
      } else {
        text = JSON.stringify(_entry);
      }
      markdownRegEx = new RegExp(
        '(https://(assets|(eu-|azure-na-|azure-eu-|gcp-na-)?images).contentstack.(io|com)/v3/assets/(.*?)/(.*?)/(.*?)/(.*?)(?="))',
        'g',
      );
      while ((markdownMatch = markdownRegEx.exec(text)) !== null) {
        if (markdownMatch && typeof markdownMatch[0] === 'string') {
          const assetDetails = markdownMatch[0].split('/');
          //fetch assetUID from url
          const assetUID = assetDetails && assetDetails[6];
          const obj = {
            uid: assetUID,
            url: markdownMatch[0],
          };
          assetDetails.push(obj);
        }
      }
    }
  
    function findAssetIdsFromJsonRte(entryObj, ctSchema) {
      if(ctSchema !== undefined){
        for (const element of ctSchema) {
          switch (element.data_type) {
            case 'blocks': {
              if (entryObj[element.uid]) {
                if (element.multiple) {
                  entryObj[element.uid].forEach((e) => {
                    let key = Object.keys(e).pop();
                    let subBlock = element.blocks.filter((block) => block.uid === key).pop();
                    findAssetIdsFromJsonRte(e[key], subBlock.schema);
                  });
                }
              }
              break;
            }
            case 'global_field':
            case 'group': {
              if (entryObj[element.uid]) {
                if (element.multiple) {
                  entryObj[element.uid].forEach((e) => {
                    findAssetIdsFromJsonRte(e, element.schema);
                  });
                } else {
                  findAssetIdsFromJsonRte(entryObj[element.uid], element.schema);
                }
              }
              break;
            }
            case 'json': {
              if (entryObj[element.uid] && element.field_metadata.rich_text_type) {
                if (element.multiple) {
                  entryObj[element.uid].forEach((jsonRteData) => {
                    gatherJsonRteAssetIds(jsonRteData);
                  });
                } else {
                  gatherJsonRteAssetIds(entryObj[element.uid]);
                }
              }
              break;
            }
          }
        }
      }
    }
  
    function gatherJsonRteAssetIds(jsonRteData) {
      jsonRteData.children.forEach((element) => {
        if (element.type) {
          switch (element.type) {
            case 'a':
            case 'p': {
              if (element.children && element.children.length > 0) {
                gatherJsonRteAssetIds(element);
              }
              break;
            }
            case 'reference': {
              if (Object.keys(element.attrs).length > 0 && element.attrs.type === 'asset') {
                assetDetails.push({ uid: element.attrs['asset-uid'] });
                if (element.attrs['asset-link']) {
                  const assetDetails = element.attrs['asset-link'].split('/');
                  //fetch assetUID from url
                  const assetUID = assetDetails && assetDetails[6];
                  const obj = {
                    uid: assetUID,
                    url: element.attrs['asset-link'],
                  };
                  assetDetails.push(obj);
                } else if (element.attrs['href']) {
                  const assetDetails = element.attrs['href'].split('/');
                  //fetch assetUID from url
                  const assetUID = assetDetails && assetDetails[6];
                  const obj = {
                    uid: assetUID,
                    url: element.attrs['href'],
                  };
                  assetDetails.push(obj);
                }
              }
              if (element.children && element.children.length > 0) {
                gatherJsonRteAssetIds(element);
              }
              break;
            }
          }
        }
      });
    }
  
    const updateAssetDetailsInEntries = function (entry) {
      let updatedEntry = Object.assign({},entry);
      entry = updateFileFields(updatedEntry, entry, null)
      entry = JSON.stringify(entry);
      const assetUrls = assetDetails.map((asset) => asset.url);
      const assetUIDs = assetDetails.map((asset) => asset.uid);
      assetUrls.forEach(function (assetUrl) {
        let mappedAssetUrl = assetUrlMapper[assetUrl];
        if (typeof mappedAssetUrl !== 'undefined') {
         entry = entry.replace(assetUrl, mappedAssetUrl);
        }
      });
  
      assetUIDs.forEach(function (assetUid) {
        let uid = assetUIDMapper[assetUid];
        if (typeof uid !== 'undefined') {
          entry = entry.replace(new RegExp(assetUid, 'img'), uid);
        }
      });
      return JSON.parse(entry);
    };

    function updateFileFields(
      object,
      parent,
      pos
    ) {
      if (isPlainObject(object) && has(object, 'filename') && has(object, 'uid')) {
        if (typeof pos !== 'undefined') {
          if (typeof pos === 'number' || typeof pos === 'string') {
            const replacer = () => {
              if (assetUIDMapper.hasOwnProperty(object.uid)) {
                parent[pos] = assetUIDMapper[object.uid];
              } else {
                parent[pos] = '';
              }
            };
    
            if (parent.uid && assetUIDMapper[parent.uid]) {
              parent.uid = assetUIDMapper[parent.uid];
            }
    
            if (
              object &&
              isObject(parent[pos]) &&
              parent[pos].uid &&
              parent[pos].url &&
              has(parent, 'asset') &&
              has(parent, '_content_type_uid') &&
              parent._content_type_uid === 'sys_assets'
            ) {
              if (
                has(parent, 'asset') &&
                has(parent, '_content_type_uid') &&
                parent._content_type_uid === 'sys_assets'
              ) {
                parent = omit(parent, ['asset']);
              }
    
              if (object.uid && assetUIDMapper[object.uid]) {
                object.uid = assetUIDMapper[object.uid];
              }
              if (object.url && assetUrlMapper[object.url]) {
                object.url = assetUrlMapper[object.url];
              }
            } else {
              replacer();
            }
          }
        }
      } else if (isPlainObject(object)) {
        for (let key in object) updateFileFields(object[key], object, key);
      } else if (isArray(object) && object.length) {
        for (let i = 0; i <= object.length; i++){
          updateFileFields(object[i], object, i);
        }    
        parent[pos] = compact(object);
      }
      return object;
    }
  
    const checkAndDownloadAsset = async function (cAsset) {
      if (cAsset) {
        const assetUID = cAsset.uid;
        const bAssetDetail = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: branch })
          .asset(assetUID)
          .fetch()
          .then((assets) => assets)
          .catch((error) => {});
        if (bAssetDetail) {
          assetUIDMapper[cAsset.uid] = bAssetDetail.uid;
          assetUrlMapper[cAsset.url] = bAssetDetail.url;
          return false;
        }
        else {
          const cAssetDetail = await managementAPIClient
            .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
            .asset(assetUID)
            .fetch()
            .then((assets) => assets)
            .catch((error) => {});
          const updatedObj = {
            parent_uid: cAssetDetail.parent_uid,
            description: cAssetDetail.description,
            title: cAssetDetail.title,
            filename: cAssetDetail.filename,
            url: cAssetDetail.url,
          };
          Object.assign(cAsset, updatedObj);
          const url = cAssetDetail?.url;
          if (url) {
            const assetFolderPath = path.resolve(assetDirPath, assetUID);
            if (!fs.existsSync(assetFolderPath)) fs.mkdirSync(assetFolderPath);
            const assetFilePath = path.resolve(assetFolderPath, cAsset.filename);
            const assetWriterStream = fs.createWriteStream(assetFilePath);
            const data = await managementAPIClient
              .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
              .asset(assetUID)
              .download({ url, responseType: 'stream' })
              .then(({ data }) => data)
              .catch((error) => {
                throw error;
              });
            assetWriterStream.on('error', (error) => {
              throw error;
            });
            data.pipe(assetWriterStream);
          }
        }
      }
      return cAsset;
    };
  
    const uploadAssets = async function () {
      const assetFolderMap = JSON.parse(fs.readFileSync(path.resolve(filePath, 'folder-mapper.json'), 'utf8'));
      const stackAPIClient = managementAPIClient.stack({ api_key: stackSDKInstance.api_key, branch_uid: branch });
      for (let i = 0; i < downloadedAssets?.length; i++) {
        const asset = downloadedAssets[i];
        let requestOption = {};
  
        requestOption.parent_uid = assetFolderMap[asset.parent_uid] || asset.parent_uid;
  
        if (asset.hasOwnProperty('description') && typeof asset.description === 'string') {
          requestOption.description = asset.description;
        }
  
        if (asset.hasOwnProperty('tags') && Array.isArray(asset.tags)) {
          requestOption.tags = asset.tags;
        }
  
        if (asset.hasOwnProperty('title') && typeof asset.title === 'string') {
          requestOption.title = asset.title;
        }
        requestOption.upload = path.resolve(assetDirPath, asset.uid, asset.filename);
        const res = await stackAPIClient
          .asset()
          .create(requestOption)
          .then((asset) => asset)
          .catch((error) => {
            throw error;
          });
        assetUIDMapper[asset.uid] = res && res.uid;
        assetUrlMapper[asset.url] = res && res.url;
      }
    };

    const getEntries = async (branchName, contentType, skip = 0, limit = 100, entries = []) => {
      let requestObject = {
        skip,
        limit,
        include_count: true,
      };
  
      const entriesSearchResponse = await managementAPIClient
        .stack({ api_key: stackSDKInstance.api_key, branch_uid: branchName })
        .contentType(contentType)
        .entry()
        .query(requestObject)
        .find();
  
      if (entriesSearchResponse?.items?.length > 0) {
        skip += limit || 100;
        entries = [...entries, ...entriesSearchResponse.items];
        if (skip >= entriesSearchResponse.count) {
          return entries;
        }
        return await getEntries(branchName, contentType, skip, limit, entries);
      }
      return entries;
    };

    const updateEntryTask = () => {
      return {
        title: 'Update Entries',
        successMessage: 'Entries Updated Successfully',
        failedMessage: 'Failed to update entries',
        task: async () => {
        let compareBranchEntries = await getEntries(compareBranch, '${contentType}')
  
        let baseBranchEntries = await getEntries(branch, '${contentType}');
  
        let contentType = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
          .contentType('${contentType}')
          .fetch();
        
          for (let i = 0; i < compareBranchEntries?.length; i++) {
            assetRefPath[compareBranchEntries[i].uid] = []
            findAssets(contentType.schema, compareBranchEntries[i], assetRefPath[compareBranchEntries[i].uid]);
          }

          for (let i = 0; i < baseBranchEntries?.items?.length; i++) {
            assetRefPath[baseBranchEntries[i].uid] = []
            findAssets(contentType.schema, baseBranchEntries[i], assetRefPath[baseBranchEntries[i].uid]);
          }
          assetDetails = [...new Map(assetDetails.map((item) => [item['uid'], item])).values()];
          newAssetDetails = assetDetails;

          if (newAssetDetails && newAssetDetails.length) {
            if (!fs.existsSync(assetDirPath)) {
              fs.mkdirSync(assetDirPath);
            }
            for (let i = 0; i < newAssetDetails.length; i++) {
              const asset = newAssetDetails[i];
              const updatedCAsset = await checkAndDownloadAsset(asset);
              if(updatedCAsset){
                newAssetDetails[i] = updatedCAsset;
                downloadedAssets.push(updatedCAsset)
              }
            }
            if (downloadedAssets?.length) await uploadAssets();
          }
          
          let flag = {
            references: false
          };
          
          const references = await findReference(contentType.schema, '', flag);
  
          async function updateEntry(entry, entryDetails) {
            if (entry) {
              Object.assign(entry, { ...entryDetails });
              await entry.update();
            }
          }

          async function updateReferences(entryDetails, baseEntry, references) {
            for (let i in references) {
              let compareEntryRef = getValueByPath(entryDetails, references[i]);
              let baseEntryRef = getValueByPath(baseEntry, references[i]);
  
              if (compareEntryRef && compareEntryRef.length > 0 && baseEntryRef && baseEntryRef.length >= 0) {
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
  
                  if(baseRefEntry?.items?.length > 0 && baseRefEntry.items[0]?.uid){
                    updateValueByPath(entryDetails, references[i], baseRefEntry.items[0].uid);
                  }
              }
            }
          }

          try {
            if (contentType?.options?.singleton) {
              compareBranchEntries?.items?.map(async (el) => {
                let entryDetails = deleteUnwantedKeysFromObject(el, keysToRemove);
                if(entryDetails !== undefined){
                  entryDetails = updateAssetDetailsInEntries(entryDetails);
    
                  if (baseBranchEntries && baseBranchEntries.length) {
                    let baseEntryUid = baseBranchEntries[0].uid;
                    let entry = await stackSDKInstance.contentType('${contentType}').entry(baseEntryUid);
                    
                    if (flag.references) {
                      await updateReferences(entryDetails, baseBranchEntries[0], references);
                    }
    
                    await updateEntry(entry, entryDetails);
                  } else {
                    let createdEntry = await stackSDKInstance.contentType('${contentType}').entry().create({ entry: entryDetails });
                  
                    if (flag.references) {
                      await updateReferences(entryDetails, createdEntry, references);
                    }
    
                    await updateEntry(createdEntry, entryDetails);
                  }
                }
              });
            } else {
              let compareMap = new Map(converter(compareBranchEntries));
              let baseMap = new Map(converter(baseBranchEntries));

              //NOTE: Filter distinct entries from the base and compare branches according to their titles.
              //TODO: Need to discuss this approach and replace it with uid condition
              let arr = uniquelyConcatenateArrays(Array.from(compareMap.keys()), Array.from(baseMap.keys()));

              // Change 
              for(let i  = 0; i < arr.length ; i++){
                let entryDetails = deleteUnwantedKeysFromObject(compareMap.get(arr[i]), keysToRemove);
                //NOTE: In the compare branch, entry must exist. Condition of deleted entry not handled
                if(entryDetails !== undefined){
                  entryDetails = updateAssetDetailsInEntries(entryDetails);
                  if (compareMap.get(arr[i]) && !baseMap.get(arr[i])) {
                    let createdEntry = await stackSDKInstance
                    .contentType('${contentType}')
                    .entry()
                    .create({ entry: entryDetails })

                    if(createdEntry){
                      if (flag.references) {
                        await updateReferences(entryDetails, createdEntry, references);
                      }     
                      await updateEntry(createdEntry, entryDetails);
                    }
                  } else if (compareMap.get(arr[i]) && baseMap.get(arr[i])) {
                    let baseEntry = baseMap.get(arr[i]);
                    let entry = await stackSDKInstance.contentType('${contentType}').entry(baseEntry.uid);
                    
                    if (flag.references) {
                      await updateReferences(entryDetails, baseEntry, references);
                    }
  
                    await updateEntry(entry, entryDetails);
                  }
                }
              }
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
