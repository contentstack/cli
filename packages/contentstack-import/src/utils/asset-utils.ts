/**
 * Assets utilities
 */

const setupNestedFolders = (folderTreeNode, folders) => {
  for (let leaf in folderTreeNode) {
    for (let folderId in folders) {
      const parentUid = folders[folderId].parent_uid;
      if (folderTreeNode.hasOwnProperty(parentUid)) {
        folderTreeNode[parentUid][folderId] = {};
        delete folders[folderId];
        setupNestedFolders(folderTreeNode[parentUid], folders);
      }
    }
  }
};

export const buildFolderTreeStructure = (folders) => {
  const tree = {};
  //Setup the root folders
  for (const folderId in folders) {
    if (!folders[folderId].parent_uid) {
      tree[folderId] = {};
      delete folders[folderId];
    }
  }
  //Setup child folders
  setupNestedFolders(tree, folders);

  return tree;
};

export const buildCreateRequestPayload = (
  folders,
  folderRootNode,
  foldersExist,
  requestPayloads = [],

  parentUid?: string,
) => {
  for (let leaf in folderRootNode) {
    // if the folder is already created, skip
    if (foldersExist.hasOwnProperty(leaf)) {
      continue;
    }
    const requestPayload = {
      json: {
        asset: {
          name: folders[leaf].name,
          parent_uid: parentUid || null,
        },
      },
      oldUid: leaf,
    };
    requestPayloads.push(requestPayload);
    if (Object.keys(folderRootNode[leaf]).length > 0) {
      buildCreateRequestPayload(folders, folderRootNode[leaf], foldersExist, requestPayloads, leaf);
    }
  }
  return requestPayloads;
};

export const makeAssetBatches = (assets, batchLimit): Array<any> => {
  let assetUids = Object.keys(assets);
  let batches = [];
  for (let i = 0; i < assetUids.length; i += batchLimit) {
    batches.push(assetUids.slice(i, i + batchLimit));
  }
  return batches;
};
