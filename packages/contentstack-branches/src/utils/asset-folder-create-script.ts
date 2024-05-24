export function assetFolderCreateScript(contentType) {
  return `
  const fs = require('fs');
  const path = require('path');
  module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config, branch, apiKey }) => {
  let filePath = config['file-path'] || process.cwd();
  let compareBranch = config['compare-branch'];
  let folderMapper = {};
  let folderBucket = [];

  const getAssetCount = async function (branchName, isDir = false) {
    const queryParam = {
      asc: 'created_at',
      include_count: true,
      skip: 10 ** 100,
    };

    if (isDir) queryParam.query = { is_dir: true };

    return await managementAPIClient
      .stack({ api_key: stackSDKInstance.api_key, branch_uid: branchName })
      .asset()
      .query(queryParam)
      .count()
      .then(({ assets }) => assets)
      .catch((error) => {});
  };

  async function getFolderJSON(skip, fCount, branchName, folderData = []) {
    const queryRequestObj = {
      skip,
      include_folders: true,
      query: { is_dir: true },
    };

    return await managementAPIClient
      .stack({ api_key: stackSDKInstance.api_key, branch_uid: branchName })
      .asset()
      .query(queryRequestObj)
      .find()
      .then(async (response) => {
        skip += 100;
        folderData = [...folderData, ...response.items];
        if (skip >= fCount) {
          return folderData;
        }
        return await getFolderJSON(skip, fCount, branchName, folderData);
      })
      .catch((error) => {});
  }

  function buildTree(coll) {
    let tree = {};
    for (let i = 0; i < coll.length; i++) {
      if (coll[i].parent_uid === null || !coll[i].hasOwnProperty('parent_uid')) {
        tree[coll[i].uid] = {};
      }
    }
    findBranches(tree, Object.keys(tree), coll);
    return tree;
  }

  function findBranches(tree, branches, coll) {
    branches.forEach((branch) => {
      for (const element of coll) {
        if (branch === element.parent_uid) {
          let childUid = element.uid;
          tree[branch][childUid] = {};
          findBranches(tree[branch], [childUid], coll);
        }
      }
    });
  }

  function buildFolderReqObjs(baseFolderUIDs, compareAssetsFolder, tree, parent_uid) {
    for (let leaf in tree) {
      //folder doesn't exists
      if (baseFolderUIDs.indexOf(leaf) === -1) {
        let folderObj = compareAssetsFolder.filter((folder) => folder.uid === leaf);
        if (folderObj && folderObj.length) {
          let requestOption = {
            folderReq: {
              asset: {
                name: folderObj[0].name,
                parent_uid: parent_uid || null,
              },
            },
            oldUid: leaf,
          };
          folderBucket.push(requestOption);
        }
      }
      if (Object.keys(tree[leaf]).length > 0) {
        buildFolderReqObjs(baseFolderUIDs, compareAssetsFolder, tree[leaf], leaf, folderBucket);
      }
    }
  }

  async function createFolder(payload) {
    if (folderMapper.hasOwnProperty(payload.folderReq.asset.parent_uid)) {
      // replace old uid with new
      payload.folderReq.asset.parent_uid = folderMapper[payload.folderReq.asset.parent_uid];
    }
    await managementAPIClient
      .stack({ api_key: apiKey, branch_uid: branch })
      .asset()
      .folder()
      .create(payload.folderReq)
      .then((res) => {
        folderMapper[payload.oldUid] = res.uid;
      })
      .catch((err) => console.log(err));
  }

  const createAssetTask = () => {
    return {
      title: 'Check and create asset folder in base branch',
      successTitle: 'Assets folder Created Successfully',
      failedTitle: 'Failed to create assets folder in base branch',
      task: async () => {
        try {
          const baseAssetsFolderCount = await getAssetCount(branch, true);
          const compareAssetsFolderCount = await getAssetCount(compareBranch, true);
          const baseAssetsFolder = await getFolderJSON(0, baseAssetsFolderCount, branch);
          const compareAssetsFolder = await getFolderJSON(0, compareAssetsFolderCount, compareBranch);
          if (Array.isArray(compareAssetsFolder) && Array.isArray(baseAssetsFolder)) {
            const baseAssetUIDs = baseAssetsFolder.map((bAsset) => bAsset.uid);
            //create new asset folder in base branch and update it in mapper
            const tree = buildTree(compareAssetsFolder);
            buildFolderReqObjs(baseAssetUIDs, compareAssetsFolder, tree, null);
            for (let i = 0; i < folderBucket.length; i++) {
              await createFolder(folderBucket[i]);
            }
            fs.writeFileSync(path.resolve(filePath, 'folder-mapper.json'), JSON.stringify(folderMapper));
          }
        } catch (error) {
          throw error;
        }
      },
    };
  };
  if (compareBranch && branch.length !== 0 && apiKey.length !== 0) {
    migration.addTask(createAssetTask());
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
}
`;
}
