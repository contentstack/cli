import * as chalk from 'chalk';
import { fsUtil } from '../../utils';
import { join } from 'path';
import { AssetRecord, ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty, orderBy, values } from 'lodash';
import { FsUtility, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import BaseImportSetup from './base-setup';

export default class AssetImportSetup extends BaseImportSetup {
  private assetsFilePath: string;
  private assetUidMapper: Record<string, string>;
  private assetUrlMapper: Record<string, string>;
  private duplicateAssets: Record<string, string>;
  private assetsConfig: ImportConfig['modules']['assets'];
  private mapperDirPath: string;
  private assetsFolderPath: string;
  private assetUidMapperPath: string;
  private assetUrlMapperPath: string;
  private duplicateAssetPath: string;

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    super({ config, stackAPIClient, dependencies });
    this.initializeContext('assets');
    this.assetsFolderPath = join(sanitizePath(this.config.contentDir), 'assets');
    this.assetsFilePath = join(sanitizePath(this.config.contentDir), 'assets', 'assets.json');
    this.assetsConfig = config.modules.assets;
    this.mapperDirPath = join(sanitizePath(this.config.backupDir), 'mapper', 'assets');
    this.assetUidMapperPath = join(sanitizePath(this.config.backupDir), 'mapper', 'assets', 'uid-mapping.json');
    this.assetUrlMapperPath = join(sanitizePath(this.config.backupDir), 'mapper', 'assets', 'url-mapping.json');
    this.duplicateAssetPath = join(sanitizePath(this.config.backupDir), 'mapper', 'assets', 'duplicate-assets.json');
    this.assetUidMapper = {};
    this.assetUrlMapper = {};
    this.duplicateAssets = {};
  }

  /**
   * Start the asset import setup
   * This method reads the assets from the content folder and generates a mapper file
   * @returns {Promise<void>}
   */
  async start() {
    try {
      fsUtil.makeDirectory(this.mapperDirPath);
      log.debug('Mapper directory created', { mapperDirPath: this.mapperDirPath });
      await this.fetchAndMapAssets();
      log.debug('Asset mapping completed', { 
        mappedCount: Object.keys(this.assetUidMapper).length,
        duplicateCount: Object.keys(this.duplicateAssets).length 
      });
      log.success(`The required setup files for the asset have been generated successfully.`);
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error occurred while generating the asset mapper');
    }
  }

  /**
   * @method importAssets
   * @param {boolean} isVersion boolean
   * @returns {Promise<void>} Promise<void>
   */
  async fetchAndMapAssets(): Promise<void> {
    log.debug('Starting asset fetch and mapping', { assetsFolderPath: this.assetsFolderPath });
    const processName = 'mapping assets';
    const indexFileName = 'assets.json';
    const basePath = this.assetsFolderPath;
    const fs = new FsUtility({ basePath, indexFileName });
    const indexer = fs.indexFileContent;
    const indexerCount = values(indexer).length;

    const onSuccess = ({
      response: { items = [] as AssetRecord[] } = {},
      apiData: { uid, url, title } = undefined,
    }: any) => {
      if (items.length === 1) {
        this.assetUidMapper[uid] = items[0].uid;
        this.assetUrlMapper[url] = items[0].url;
        log.info(`Mapped asset successfully: '${title}'`);
      } else if (items.length > 1) {
        this.duplicateAssets[uid] = items.map((asset: any) => {
          return { uid: asset.uid, title: asset.title, url: asset.url };
        });
        log.info(`Multiple assets found with the title '${title}'.`);
      } else {
        log.info(`Asset with title '${title}' not found in the stack!`);
      }
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      handleAndLogError(error, { ...this.config.context }, `Failed to map the asset '${title}'`);
    };

    /* eslint-disable @typescript-eslint/no-unused-vars, guard-for-in */
    for (const index in indexer) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        log.error(String(error), { error });
      });

      if (chunk) {
        let apiContent = orderBy(values(chunk as Record<string, any>[]), '_version');

        await this.makeConcurrentCall(
          {
            apiContent,
            processName,
            indexerCount,
            currentIndexer: +index,
            apiParams: {
              reject: onReject,
              resolve: onSuccess,
              entity: 'fetch-assets',
              includeParamOnCompletion: true,
            },
            concurrencyLimit: this.assetsConfig.fetchConcurrency,
          },
          undefined,
        );
      }
    }

    if (!isEmpty(this.assetUidMapper) || !isEmpty(this.assetUrlMapper)) {
      fsUtil.writeFile(this.assetUidMapperPath, this.assetUidMapper);
      fsUtil.writeFile(this.assetUrlMapperPath, this.assetUrlMapper);
    }
    if (!isEmpty(this.duplicateAssets)) {
      fsUtil.writeFile(this.duplicateAssetPath, this.duplicateAssets);
      log.info(`Duplicate asset files are stored at: ${this.duplicateAssetPath}.`);
    }
  }
}
