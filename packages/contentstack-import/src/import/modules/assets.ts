import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import * as pLimit from 'promise-limit';
import { fileHelper, assetUtils } from '../../utils';
export default class AssetImport {
  private context: any;
  private stackAPIClient: any;
  private importConfig: any;
  private assetConfig: any;
  private assetDirPath: any;
  private mapperDirPath: any;
  private envPath: any;
  private assetUidMapperPath: any;
  private assetUrlMapperPath: any;
  private foldersMap: any;
  private assetBatchLimit: number;
  private assetUidMap: any;
  private assetUrlMap: any;
  private environments: any;

  constructor(context, stackAPIClient, importConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
    this.assetConfig = importConfig.moduleLevelConfig.assets;
    this.assetDirPath = path.join(this.importConfig.backupDir, this.assetConfig.dirName);
    this.mapperDirPath = path.join(this.importConfig.backupDir, 'mapper', 'assets');
    this.envPath = path.join(this.importConfig.backupDir, 'environments', 'environments.json');
    this.assetUidMapperPath = path.join(this.importConfig.backupDir, 'uid-mapping.json');
    this.assetUrlMapperPath = path.join(this.importConfig.backupDir, 'url-mapping.json');
    this.assetBatchLimit = +this.assetConfig.assetBatchLimit || 2; // parsing to a number
    this.foldersMap = {};
    this.assetUidMap = {};
    this.assetUrlMap = {};
    this.environments = {};
  }

  async start() {
    try {
      const assets = await fileHelper.readJSONFile(path.resolve(this.assetDirPath, this.assetConfig.fileName));
      if (!assets) {
        logger.info('No Assets found to import');
        return;
      }
      this.environments = await fileHelper.readJSONFile(this.envPath);
      await fileHelper.makeDirectory(this.mapperDirPath);
      await this.importFolders();
      logger.info('Completed folders import');
      await this.importAssets(assets);
      logger.info('Completed Assets import');
    } catch (error) {
      logger.error('Error while importing assets/folders', error);
    }
  }

  async importFolders(): Promise<any> {
    const folders = await fileHelper.readJSONFile(path.resolve(this.assetDirPath, 'folders.json'));
    if (!Array.isArray(folders) || folders.length <= 0) {
      logger.info('No folders found to import');
      return;
    }
    const mappedFolderPath = path.resolve(this.importConfig.backupDir, 'mapper', 'assets', 'folder-mapping.json');
    try {
      this.foldersMap = (await fileHelper.readJSONFile(mappedFolderPath)) || {};
    } catch (error) {
      logger.debug('No existing folders found', error);
      logger.info('No existing folders found');
    }

    // Converting folders into an object for better operations
    const foldersObj = folders.reduce((obj, folder) => ({ ...obj, [folder.uid]: folder }), {});
    const folderTreeStructure = assetUtils.buildFolderTreeStructure({ ...foldersObj });
    const folderCreateRequestPayloads: Array<any> = assetUtils.buildCreateRequestPayload(
      foldersObj,
      folderTreeStructure,
      this.foldersMap,
    );

    for (const requestPayload of folderCreateRequestPayloads) {
      if (this.foldersMap.hasOwnProperty(requestPayload.json.asset.parent_uid)) {
        // replace old folder uid with new
        requestPayload.json.asset.parent_uid = this.foldersMap[requestPayload.json.asset.parent_uid];
      }
      try {
        const folderCreationResponse = await this.stackAPIClient.asset().folder().create(requestPayload.json);
        this.foldersMap[requestPayload.oldUid] = folderCreationResponse.uid;
      } catch (error) {
        logger.error(`Failed to import folder - name: ${requestPayload.json.asset.name}`, error);
      }
    }

    try {
      await fileHelper.writeFile(mappedFolderPath, this.foldersMap);
    } catch (error) {
      logger.error('Failed to writer folders map to file', error);
    }
  }

  async importAssets(assets): Promise<any> {
    try {
      this.assetUidMap = (await fileHelper.readJSONFile(this.assetUidMapperPath)) || {};
    } catch (error) {
      logger.debug('No existing asset uid map file found', error);
    }
    try {
      this.assetUidMap = (await fileHelper.readJSONFile(this.assetUrlMapperPath)) || {};
    } catch (error) {
      logger.debug('No existing asset url map file found', error);
    }

    const assetBatch = assetUtils.makeAssetBatches(assets, this.assetBatchLimit);

    for (const batch of assetBatch) {
      for (const assetUid of batch) {
        if (this.assetUidMap.hasOwnProperty(assetUid)) {
          logger.debug(`Skipping upload assets with id ${assetUid}, already uploaded`);
          continue;
        }
        const assetFolderPath = path.join(this.assetDirPath, assetUid);
        if (!(await fileHelper.isFolderExist(assetFolderPath))) {
          logger.error(`Asset with id ${assetUid} not found to upload`);
          continue;
        }
        try {
          if (this.importConfig.versioning) {
            const versionedAssetsResponse = await this.uploadVersionedAsset(assetUid, assetFolderPath);
          } else {
            // Set the folder path to assets
            if (typeof assets[assetUid].parent_uid === 'string') {
              if (this.foldersMap.hasOwnProperty(assets[assetUid].parent_uid)) {
                assets[assetUid].parent_uid = this.foldersMap[assets[assetUid].parent_uid];
                const assetFilePath = path.join(assetFolderPath, assets[assetUid].filename);
                const assetUploadResponse = await this.uploadAsset(assets[assetUid], assetFilePath);
                this.assetUidMap[assetUid] = assetUploadResponse.uid;
                this.assetUrlMap[assets[assetUid].url] = assetUploadResponse.url;

                //Publish assets
                if (this.importConfig.entriesPublish && assets[assetUid].publish_details.length > 0) {
                  try {
                    await this.publish(assetUploadResponse.uid, assets[assetUid]);
                    logger.info(`Published assets with new id ${assetUploadResponse.uid}`);
                  } catch (error) {
                    logger.error(`failed to publish assets with new id ${assetUploadResponse.uid}`, error);
                  }
                } else {
                  logger.debug(`Not publishing asset with id ${assetUid}`);
                }
              } else {
                logger.warn(`Asset's folder not found, asset id ${assetUid}`);
              }
            }
          }
        } catch (error) {
          logger.error(`Failed upload to upload assets with id ${assetUid}`, error);
        }
      }
    }
  }

  async uploadAsset(asset, assetFilePath): Promise<any> {
    const assetCreateRequestPayload: any = {
      parent_uid: asset.parent_uid,
      description: asset.description,
      title: asset.title,
      upload: assetFilePath,
    };
    if (Array.isArray(asset.tags)) {
      assetCreateRequestPayload.tags = asset.tags;
    }

    return this.stackAPIClient.asset().create(assetCreateRequestPayload);
  }

  async uploadVersionedAsset(assetUid, assetFolderPath): Promise<any> {
    throw new Error('Not implemented');
    // read version file
    // cons versionedAssetMetadata = helper.readFile(path.join(assetFolderPath, '_contentstack_' + uid + '.json'))
    // // using last version, find asset's parent
    // let lastVersion = versionedAssetMetadata[versionedAssetMetadata.length - 1]
    // if (typeof lastVersion.parent_uid === 'string') {
    //   if (self.mappedFolderUids.hasOwnProperty(lastVersion.parent_uid)) {
    //     // update each version of that asset with the last version's parent_uid
    //     versionedAssetMetadata.forEach(function (assetMetadata) {
    //       assetMetadata.parent_uid = self.mappedFolderUids[lastVersion.parent_uid]
    //     })
    //   } else {
    //     addlogs(config, (lastVersion.parent_uid + ' parent_uid was not found! Thus, setting it as \'null\'', 'error'))
    //     versionedAssetMetadata.forEach(function (assetMetadata) {
    //       assetMetadata.parent_uid = null
    //     })
    //   }
    // }
    // let versionedAssets = await fileHelper.readJSONFile(path.join(this.assetDirPath, `_contentstack_${assetUid}.json`));
    // const latestVersion = versionedAssets[versionedAssets.length - 1];
    // if (typeof latestVersion.parent_uid === 'string') {
    //   if (this.foldersMap.hasOwnProperty(latestVersion.parent_uid)) {
    //     versionedAssets = versionedAssets.map((asset) => {
    //       asset.parent_uid = this.foldersMap[latestVersion.parent_uid];
    //     });
    //   } else {
    //     logger.warn(`Asset's folder not found, asset id ${latestVersion.uid}`);
    //   }
    // }
    // // upload first data
    // for (const asset of versionedAssets) {
    // }
  }

  async publish(assetUid, asset): Promise<any> {
    const assetEnvironments = [];
    const localeLookup = new Map();

    asset.publish_details.forEach((publishPayload) => {
      if (this.environments.hasOwnProperty(publishPayload.environment)) {
        assetEnvironments.push(this.environments[publishPayload.environment].name);
        if (!localeLookup.has(publishPayload.locale)) {
          localeLookup.set(publishPayload.locale, publishPayload.locale);
        }
      }
    });
    const assetPublishRequestPayload = {
      publishDetails: {
        environments: assetEnvironments,
        locales: Array.from(localeLookup, ([key, value]) => value),
      },
    };
    return this.stackAPIClient.asset(assetUid).publish(assetPublishRequestPayload);
  }
}
