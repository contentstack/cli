import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { AssetRecord, ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty, orderBy, values } from 'lodash';
import { formatError, FsUtility, sanitizePath } from '@contentstack/cli-utilities';
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
      await this.fetchAndMapAssets();
      log(this.config, `The required setup files for the asset have been generated successfully.`, 'success');
    } catch (error) {
      log(this.config, `Error occurred while generating the asset mapper: ${formatError(error)}.`, 'error');
    }
  }

  /**
   * @method importAssets
   * @param {boolean} isVersion boolean
   * @returns {Promise<void>} Promise<void>
   */
  async fetchAndMapAssets(): Promise<void> {
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
        log(this.config, `Mapped asset successfully: '${title}'`, 'info');
      } else if (items.length > 1) {
        this.duplicateAssets[uid] = items.map((asset: any) => {
          return { uid: asset.uid, title: asset.title, url: asset.url };
        });
        log(this.config, `Multiple assets found with the title '${title}'.`, 'info');
      } else {
        log(this.config, `Asset with title '${title}' not found in the stack!`, 'info');
      }
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      log(this.config, `Failed to map the asset '${title}'.`, 'error');
      log(this.config, formatError(error), 'error');
    };

    /* eslint-disable @typescript-eslint/no-unused-vars, guard-for-in */
    for (const index in indexer) {
      const chunk = await fs.readChunkFiles.next().catch((error) => {
        log(this.config, error, 'error');
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
      log(this.config, `Duplicate asset files are stored at: ${this.duplicateAssetPath}.`, 'info');
    }
  }
}
