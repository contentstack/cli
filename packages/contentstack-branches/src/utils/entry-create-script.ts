export function entryCreateScript(contentType) {
  return `
  const fs = require('fs');
  const path = require('path');
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
    let cAssetDetails = [];
    let assetUIDMapper = {};
    let assetUrlMapper = {};
    let assetRefPath = {};
    let isAssetDownload = false;

    function getValueByPath(obj, path) {
      return path.split('[').reduce((o, key) => o && o[key.replace(/\]$/, '')], obj);
    }
  
    function updateValueByPath(obj, path, newValue, type, fileIndex) {
      path.split('[').reduce((o, key, index, arr) => {
        if (index === arr.length - 1) {
          if (type === 'file') {
            o[key.replace(/]$/, '')][fileIndex] = newValue;
          } else {
            o[key.replace(/]$/, '')][0].uid = newValue;
          }
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

    const findAssets = function (schema, entry, refPath, path) {
      for (const i in schema) {
        const currentPath = path ? path + '[' + schema[i].uid : schema[i].uid;
        if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
          findAssets(schema[i].schema, entry, refPath, currentPath + '[0]');
        } else if (schema[i].data_type === 'blocks') {
          for (const block in schema[i].blocks) {
            {
              if (schema[i].blocks[block].schema) {
                findAssets(
                  schema[i].blocks[block].schema,
                  entry,
                  refPath,
                  currentPath + '[' + block + '][' + schema[i].blocks[block].uid + ']',
                );
              }
            }
          }
        } else if (schema[i].data_type === 'json' && schema[i].field_metadata.rich_text_type) {
          findAssetIdsFromJsonRte(entry, schema, refPath, path);
        } else if (
          schema[i].data_type === 'text' &&
          schema[i].field_metadata &&
          (schema[i].field_metadata.markdown || schema[i].field_metadata.rich_text_type)
        ) {
          findFileUrls(schema[i], entry);
        } else if (schema[i].data_type === 'file') {
          refPath.push(currentPath)
          const imgDetails = getValueByPath(entry, currentPath);
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
                cAssetDetails.push(obj);
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
              cAssetDetails.push(obj);
            }
          }
        }
      }
    };
  
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
        '(https://(assets|(eu-|azure-na-|azure-eu-)?images).contentstack.(io|com)/v3/assets/(.*?)/(.*?)/(.*?)/(.*?)(?="))',
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
          cAssetDetails.push(obj);
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
                cAssetDetails.push({ uid: element.attrs['asset-uid'] });
                if (element.attrs['asset-link']) {
                  const assetDetails = element.attrs['asset-link'].split('/');
                  //fetch assetUID from url
                  const assetUID = assetDetails && assetDetails[6];
                  const obj = {
                    uid: assetUID,
                    url: element.attrs['asset-link'],
                  };
                  cAssetDetails.push(obj);
                } else if (element.attrs['href']) {
                  const assetDetails = element.attrs['href'].split('/');
                  //fetch assetUID from url
                  const assetUID = assetDetails && assetDetails[6];
                  const obj = {
                    uid: assetUID,
                    url: element.attrs['href'],
                  };
                  cAssetDetails.push(obj);
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
      assetRefPath[entry.uid].forEach((refPath) => {
        let imgDetails = entry[refPath];
        if (imgDetails !== undefined) {
          if (imgDetails && !Array.isArray(imgDetails)) {
            entry[refPath] = assetUIDMapper[imgDetails.uid];
          } else if (imgDetails && Array.isArray(imgDetails)) {
            for (let i = 0; i < imgDetails.length; i++) {
              const img = imgDetails[i];
              entry[refPath][i] = assetUIDMapper[img.uid];
            }
          }
        } else {
          imgDetails = getValueByPath(entry, refPath);
          if (imgDetails && !Array.isArray(imgDetails)) {
            const imgUID = imgDetails?.uid;
            updateValueByPath(entry, refPath, assetUIDMapper[imgUID], 'file', 0);
          } else if (imgDetails && Array.isArray(imgDetails)) {
            for (let i = 0; i < imgDetails.length; i++) {
              const img = imgDetails[i];
              const imgUID = img?.uid;
              updateValueByPath(entry, refPath, assetUIDMapper[imgUID], 'file', i);
            }
          }
        }
      });
      entry = JSON.stringify(entry);
      const assetUrls = cAssetDetails.map((asset) => asset.url);
      const assetUIDs = cAssetDetails.map((asset) => asset.uid);
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
  
    const checkAndDownloadAsset = async function (cAsset) {
      const assetUID = cAsset?.uid;
      if (cAsset && assetUID) {
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
          isAssetDownload = true;
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
      for (let i = 0; i < cAssetDetails?.length; i++) {
        const asset = cAssetDetails[i];
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
    
    function handleErrorMsg(err) {
      if (err?.errorMessage) {
       console.log(err.errorMessage);
      } else if (err?.message) {
        console.log(err.message);
      }
    }

    const createEntryTask = () => {
      return {
        title: 'Create Entries',
        successTitle: 'Entries Created Successfully',
        failedTitle: 'Failed to create entries',
        task: async () => {
          const compareBranchEntries = await managementAPIClient
            .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
            .contentType('${contentType}')
            .entry()
            .query()
            .find();
          
          const compareFilteredProperties = compareBranchEntries.items.map((entry) => {
            keysToRemove.map((key) => delete entry[key]);
            return entry;
          });
          
          let contentType = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch })
          .contentType('${contentType}')
          .fetch();

          for (let i = 0; i < compareBranchEntries?.items?.length; i++) {
            assetRefPath[compareBranchEntries.items[i].uid] = []
            findAssets(contentType.schema, compareBranchEntries.items[i], assetRefPath[compareBranchEntries.items[i].uid]);
            cAssetDetails = [...new Map(cAssetDetails.map((item) => [item['uid'], item])).values()];
          }
          if (cAssetDetails && cAssetDetails.length) {
            if (!fs.existsSync(assetDirPath)) {
              fs.mkdirSync(assetDirPath);
            }
            for (let i = 0; i < cAssetDetails.length; i++) {
              const asset = cAssetDetails[i];
              const updatedCAsset = await checkAndDownloadAsset(asset);
              if (updatedCAsset) {
                cAssetDetails[i] = updatedCAsset;
              }
            }
            if (isAssetDownload) await uploadAssets();
          }

          let flag = {
            references: false,
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
            compareFilteredProperties.length !== 0 &&
              compareFilteredProperties.forEach(async (entryDetails) => {
                entryDetails = updateAssetDetailsInEntries(entryDetails);
                let createdEntry = await stackSDKInstance.contentType('${contentType}').entry().create({ entry: entryDetails }).catch(error => {
                  throw error;
                });
                if(createdEntry){
                  if (flag.references) {
                    await updateReferences(entryDetails, createdEntry, references);
                  }
                  await updateEntry(createdEntry, entryDetails);
                }
              });
          } catch (error) {
            throw error;
          }
        },
      };
    };
    if (compareBranch && branch.length !== 0 && apiKey.length !== 0) {
      migration.addTask(createEntryTask());
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
  };
`;
}
