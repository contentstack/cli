import * as chalk from 'chalk';
import { fsUtil } from '../../utils';
import { join } from 'path';
import { AssetRecord, ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty, orderBy, values } from 'lodash';
import { FsUtility, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

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
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.ASSETS];
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
      const progress = this.createNestedProgress(this.currentModuleName);
      
      // Analyze to get chunk count
      const indexerCount = await this.withLoadingSpinner('ASSETS: Analyzing import data...', async () => {
        const basePath = this.assetsFolderPath;
        const fs = new FsUtility({ basePath, indexFileName: 'assets.json' });
        const indexer = fs.indexFileContent;
        return values(indexer).length;
      });

      if (indexerCount === 0) {
        log(this.config, 'No assets found in the content folder.', 'info');
        return;
      }

      // Add processes - use a large number for total assets since we don't know exact count
      // The progress will update as we process each asset
      progress.addProcess(PROCESS_NAMES.ASSETS_MAPPER_GENERATION, 1);
      progress.addProcess(PROCESS_NAMES.ASSETS_FETCH_AND_MAP, indexerCount * 10); // Estimate: ~10 assets per chunk

      // Create mapper directory
      progress
        .startProcess(PROCESS_NAMES.ASSETS_MAPPER_GENERATION)
        .updateStatus(
          PROCESS_STATUS.ASSETS_MAPPER_GENERATION.GENERATING,
          PROCESS_NAMES.ASSETS_MAPPER_GENERATION,
        );
      fsUtil.makeDirectory(this.mapperDirPath);
      this.progressManager?.tick(true, 'mapper directory created', null, PROCESS_NAMES.ASSETS_MAPPER_GENERATION);
      progress.completeProcess(PROCESS_NAMES.ASSETS_MAPPER_GENERATION, true);

      // Fetch and map assets
      progress
        .startProcess(PROCESS_NAMES.ASSETS_FETCH_AND_MAP)
        .updateStatus(
          PROCESS_STATUS.ASSETS_FETCH_AND_MAP.FETCHING,
          PROCESS_NAMES.ASSETS_FETCH_AND_MAP,
        );
      await this.fetchAndMapAssets();
      progress.completeProcess(PROCESS_NAMES.ASSETS_FETCH_AND_MAP, true);

      this.completeProgress(true);
      log(this.config, `The required setup files for the asset have been generated successfully.`, 'success');
    } catch (error) {
      this.completeProgress(false, error?.message || 'Assets mapper generation failed');
      log(this.config, `Error occurred while generating the asset mapper: ${formatError(error)}.`, 'error');
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
        this.progressManager?.tick(true, `asset: ${title}`, null, PROCESS_NAMES.ASSETS_FETCH_AND_MAP);
        log(this.config, `Mapped asset successfully: '${title}'`, 'info');
      } else if (items.length > 1) {
        this.duplicateAssets[uid] = items.map((asset: any) => {
          return { uid: asset.uid, title: asset.title, url: asset.url };
        });
        this.progressManager?.tick(true, `asset: ${title} (duplicate)`, null, PROCESS_NAMES.ASSETS_FETCH_AND_MAP);
        log(this.config, `Multiple assets found with the title '${title}'.`, 'info');
      } else {
        this.progressManager?.tick(false, `asset: ${title}`, 'Not found in stack', PROCESS_NAMES.ASSETS_FETCH_AND_MAP);
        log(this.config, `Asset with title '${title}' not found in the stack!`, 'info');
      }
    };
    const onReject = ({ error, apiData: { title } = undefined }: any) => {
      this.progressManager?.tick(false, `asset: ${title}`, formatError(error), PROCESS_NAMES.ASSETS_FETCH_AND_MAP);
      log(this.config, `Failed to map the asset '${title}'.`, 'error');
      log(this.config, formatError(error), 'error');
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
