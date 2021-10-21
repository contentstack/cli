import * as path from 'path';
import * as fs from 'fs';
import * as httpCall from 'https';
import * as uniqueObjects from 'get-unique-objects';
import * as pLimit from 'promise-limit';
import { fileHelper } from '../../utils';
export default class AssetExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private assetConfig: any;
  private assetContents: any;
  private folderData: any;
  private assetsFolderPath: any;
  private assetContentsFile: any;
  private folderJSONPath: any;
  private batchLimit: any;
  private downloadLimit: any;
  private invalidKeys: any;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.assetConfig = exportConfig.moduleLevelConfig.assets;
    this.assetContents = {};
    this.folderData = [];
    this.batchLimit = this.assetConfig.batchLimit || 15;
    this.downloadLimit = this.assetConfig.downloadLimit || 3;
    this.invalidKeys = this.assetConfig.invalidKeys;
    this.assetsFolderPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.assetConfig.dirName);
    this.assetContentsFile = path.resolve(this.assetsFolderPath, 'assets.json');
    this.folderJSONPath = path.resolve(this.assetsFolderPath, 'folders.json');
  }

  async start() {
    console.log('started assets');
    try {
      // create a directory
      await fileHelper.makeDirectory(this.assetsFolderPath);
      const assetCount = await this.getAssetCount();
      if (assetCount === 0) {
        return;
      }
      const assetBatchCount = AssetExport.makeAssetBatches(this.batchLimit, assetCount);
      const totalAssets = {};
      for (const batchCount of assetBatchCount) {
        const assets = await this.getAssetsByBatch(batchCount);
        const promiseRunner = pLimit(1);
        const result = await Promise.all(
          assets.map(async (asset) =>
            promiseRunner(() => {
              totalAssets[asset.uid] = asset;
              return this.getAssetsByVersions(asset.uid, asset._version);
            }),
          ),
        );
      }
      await fileHelper.writeFile(this.assetContentsFile, totalAssets);
      await this.exportFolders();
      console.log('Assets export completed');
    } catch (error) {
      console.log('Error in asset exports', error);
    }
  }

  async getAssetCount(folder?: boolean): Promise<any> {
    let assetCount, queryOptions;
    if (folder && typeof folder === 'boolean') {
      queryOptions = { include_folders: true, query: { is_dir: true }, include_count: true };
      assetCount = (await this.stackAPIClient.asset().query(queryOptions).find()).count;
    } else {
      queryOptions = { include_count: true };
      assetCount = (await this.stackAPIClient.asset().query(queryOptions).find()).count;
    }

    return assetCount;
  }

  async getAssetsByBatch(batchSize = 0): Promise<any> {
    const queryRequestObj = {
      skip: batchSize,
      limit: this.batchLimit,
      include_publish_details: true,
      except: {
        BASE: this.invalidKeys,
      },
    };
    const { items } = await this.stackAPIClient.asset().query(queryRequestObj).find();
    return items;
  }

  async getAssetsByVersions(uid: string, version: number, assetVersionInfo = []): Promise<any> {
    if (version <= 0) {
      const assetVersionInfoFile = path.resolve(this.assetsFolderPath, uid, '_contentstack_' + uid + '.json');
      await fileHelper.writeFile(assetVersionInfoFile, assetVersionInfo);
      return true;
    }
    const queryOptions = {
      version: version,
      include_publish_details: true,
      except: {
        BASE: this.invalidKeys,
      },
    };

    const versionedAssetJSONResponse = await this.stackAPIClient.asset(uid).fetch(queryOptions);
    const downloadResponse = await this.downloadAssets(versionedAssetJSONResponse);
    assetVersionInfo.splice(0, 0, versionedAssetJSONResponse);
    // Remove duplicates
    assetVersionInfo = uniqueObjects(assetVersionInfo);
    return await this.getAssetsByVersions(uid, --version, assetVersionInfo);
  }

  async downloadAssets(asset): Promise<any> {
    const assetFolderPath = path.resolve(this.assetsFolderPath, asset.uid);
    const assetFilePath = path.resolve(assetFolderPath, asset.filename);
    if (fs.existsSync(assetFilePath)) {
      return true;
    }
    return new Promise((resolve, reject) => {
      httpCall.get(asset.url, async (res) => {
        await fileHelper.makeDirectory(assetFolderPath);
        const assetFileStream = fs.createWriteStream(assetFilePath);
        res.on('data', function (chunk) {
          assetFileStream.write(chunk);
        });
        res.on('end', function () {
          assetFileStream.end();
          resolve('done');
        });
        res.on('error', function (error) {
          assetFileStream.end();
          reject(error);
        });
      });
    });
  }

  async exportFolders(): Promise<any> {
    const folderCount = await this.getAssetCount(true);
    if (folderCount === 0) {
      return;
    }
    await this.getFolders(0, folderCount);
  }

  async getFolders(skip = 0, fCount): Promise<any> {
    if (skip >= fCount) {
      await fileHelper.writeFile(this.folderJSONPath, this.folderData);
      return true;
    }

    const queryRequestObj = {
      include_folders: true,
      query: { is_dir: true },
      skip: skip,
    };

    const { items = [] } = await this.stackAPIClient.asset().query(queryRequestObj).find();
    items.forEach((folder) => {
      this.folderData.push(folder);
    });

    skip += 100;
    return await this.getFolders(skip, fCount);
  }

  static makeAssetBatches(batchLimit, assetCount: number): Array<number> {
    const assetBatches = [];
    for (let i = 0; i <= assetCount; i += batchLimit) {
      assetBatches.push(i);
    }
    return assetBatches;
  }
}
