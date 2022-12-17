import map from "lodash/map";
import chunk from "lodash/chunk";
import first from "lodash/first";
import filter from "lodash/filter";
import values from "lodash/values";
import { Flags } from "@oclif/core";
import entries from "lodash/entries";
import isEmpty from "lodash/isEmpty";
import includes from "lodash/includes";
import { createWriteStream } from "fs";
import { resolve as pResolve } from "path";

import BaseClass, {
  CustomPromiseHandler,
  CustomPromiseHandlerInput,
} from "./base-class";
import config from "@/config/default";
import { FsUtility } from "@/fs-utility";
import { log } from "@/old-scripts/lib/util/log";
import { getDirectories, getFileList } from "@/fs-utility/core";

export class ExportAssets extends BaseClass {
  private assetsRootPath: string;
  private assetsFolder: object[] = [];
  private versionedAssets: object[] = [];
  public assetConfig = config.modules.assets;

  static description = "Export assets from a stack";

  // hide the command from help
  static hidden = true;

  // custom usage string for help
  // this overrides the default usage
  static usage = "cm:stacks:module:assets";

  // examples to add to help
  // <%= config.bin %> resolves to the executable name
  // <%= command.id %> resolves to the command name
  static examples = [
    "<%= config.bin %> <%= command.id %> --help",
    "<%= config.bin %> <%= command.id %> --alias <management_token_alias> --config <path/to/config/file>",
    "<%= config.bin %> <%= command.id %> --alias <management_token_alias> --data-dir <path/to/export/destination/dir>",
  ];

  // define aliases that can execute this command.
  static aliases = ["cm:stacks:module:assets"];

  static flags = {
    config: Flags.string({
      char: "c",
      description: "[optional] path of the config",
      parse: async (input) => (input ? JSON.parse(input) : undefined),
    }),
  };

  get commonQueryParam() {
    return {
      skip: 0,
      asc: "created_at",
      include_count: false,
    };
  }

  async catch(error: any) {
    console.info(error.message);
  }

  async run() {
    const { flags } = await this.parse(ExportAssets);
    this.exportConfig = flags.config;
    await this.start(flags);
  }

  // Client, config
  async start(flags: Record<string, any>) {
    this.assetsRootPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || "",
      this.assetConfig.dirName
    );
    // NOTE step 1: Get assets folder count
    const assetsFolderCount = (await this.getAssetsRelatedCount(true)) || 0;

    // NOTE step 2: Get assets folder
    if (assetsFolderCount) await this.getAssetsFolders(assetsFolderCount);

    // NOTE step 3: Get assets count
    const assetsCount = (await this.getAssetsRelatedCount()) || 0;

    // NOTE step 4: Get assets
    if (assetsCount) await this.getAssets(assetsCount);

    // NOTE step 4: Get versioned assets
    if (!isEmpty(this.versionedAssets)) await this.getVersionedAssets();

    // NOTE step 6: Download all assets
    await this.downloadAssets();
  }

  /**
   * @method getAssetsFolders
   * @returns Promise
   */
  getAssetsFolders(totalCount: number): Promise<any | void> {
    const queryParam = {
      ...this.commonQueryParam,
      query: { is_dir: true },
    };

    const onSuccess = ({ response: { items } }: any) => {
      this.assetsFolder.push(...items);
    };
    const onReject = ({ error }: any) => {
      log(this.exportConfig, "Export asset folder query failed", "error");
      log(this.exportConfig, error, "error");
    };

    return this.makeConcurrentCall({
      totalCount,
      apiParams: {
        queryParam,
        module: "assets",
        reject: onReject,
        resolve: onSuccess,
      },
      module: "assets folders",
      concurrencyLimit: this.assetConfig.fetchConcurrency,
    }).then(() => {
      if (!isEmpty(this.assetsFolder)) {
        new FsUtility({ basePath: this.assetsRootPath }).writeFile(
          pResolve(this.assetsRootPath, "folders.json"),
          this.assetsFolder
        );
      }
      log(this.exportConfig, "Assets folder Exported successfully.!", "info");
    });
  }

  /**
   * @method getAssets
   * @param totalCount number
   * @returns Promise<void>
   */
  getAssets(totalCount: number): Promise<any | void> {
    const self = this;
    let metaHandler;
    const queryParam = {
      ...this.commonQueryParam,
      include_publish_details: true,
      except: { BASE: this.assetConfig.invalidKeys },
    };

    if (this.assetConfig.includeVersionedAssets) {
      function customHandler(array: Array<any>) {
        const versionAssets: Array<any> = filter(
          array,
          ({ _version }: any) => _version > 1
        );
        if (!isEmpty(versionAssets)) {
          self.versionedAssets.push(
            ...map(versionAssets, ({ uid, _version }: any) => ({
              [uid]: _version,
            }))
          );
        }
      }
      metaHandler = customHandler;
    }

    let fs: FsUtility = new FsUtility({
      metaHandler,
      moduleName: "assets",
      indexFileName: "assets.json",
      basePath: this.assetsRootPath,
      metaPickKeys: ["uid", "url", "filename"],
      chunkFileSize: this.assetConfig.chunkFileSize,
    });

    const onReject = ({ error, isLastRequest }: any) => {
      log(this.exportConfig, "Export asset query failed", "error");
      log(this.exportConfig, error.message, "error");
      if (fs && isLastRequest) fs.completeFile();
    };

    const onSuccess = ({ response: { items } }: any) => fs.writeIntoFile(items);

    return this.makeConcurrentCall({
      module: "assets",
      totalCount,
      apiParams: {
        queryParam,
        module: "assets",
        reject: onReject,
        resolve: onSuccess,
      },
      concurrencyLimit: this.assetConfig.fetchConcurrency,
    }).then(() => {
      fs.completeFile(true);
      log(this.exportConfig, "Assets exported successfully.!", "info");
    });
  }

  /**
   * @method getVersionedAssets
   * @returns Promise<any|void>
   */
  getVersionedAssets(): Promise<any | void> {
    const self = this;
    let fs: FsUtility = new FsUtility({
      moduleName: "assets",
      indexFileName: "versioned-assets.json",
      chunkFileSize: this.assetConfig.chunkFileSize,
      metaPickKeys: ["uid", "url", "filename", "_version"],
      basePath: pResolve(this.assetsRootPath, "versions"),
    });
    const queryParam = {
      ...this.commonQueryParam,
      include_publish_details: true,
      except: { BASE: this.assetConfig.invalidKeys },
    };
    const versionedAssets = map(this.versionedAssets, (element) => {
      let batch = [];
      const [uid, version]: any = first(entries(element));

      for (let index = 1; index < version; index++) {
        batch.push({ [uid]: index });
      }

      return batch;
    }).flat();
    const apiBatches: Array<any> = chunk(
      versionedAssets,
      this.assetConfig.fetchConcurrency
    );

    const promisifyHandler: CustomPromiseHandler = (
      input: CustomPromiseHandlerInput
    ) => {
      const { index, batchIndex, apiParams, isLastRequest } = input;
      const batch: Record<string, number> = apiBatches[batchIndex][index];
      const [uid, version]: any = first(entries(batch));

      if (apiParams?.queryParam) {
        apiParams.uid = uid;
        apiParams.queryParam.version = version;

        return self.makeAPICall(apiParams, isLastRequest);
      }

      return Promise.resolve();
    };
    const onSuccess = ({ response }: any) => {
      fs.writeIntoFile([response], {
        mapKeyVal: true,
        keyName: ["uid", "_version"],
      });
    };
    const onReject = ({ error }: any) => {
      log(this.exportConfig, "Export versioned asset query failed", "error");
      log(this.exportConfig, error, "error");
      fs.completeFile();
    };

    return this.makeConcurrentCall(
      {
        apiBatches,
        apiParams: {
          queryParam,
          module: "asset",
          reject: onReject,
          resolve: onSuccess,
        },
        module: "versioned assets",
        totalCount: versionedAssets.length,
        concurrencyLimit: this.assetConfig.fetchConcurrency,
      },
      promisifyHandler
    ).then(() => {
      fs.completeFile(true);
      log(this.exportConfig, "Assets folder Exported successfully.!", "info");
    });
  }

  /**
   * @method getAssetsRelatedCount
   * @param isDir boolean
   * @returns Promise<number|undefined>
   */
  getAssetsRelatedCount(isDir = false): Promise<number | void> {
    const queryParam: any = {
      limit: 1,
      ...this.commonQueryParam,
      skip: Math.pow(10, 100),
    };

    if (isDir) queryParam.query = { is_dir: true };

    return this.stack
      .asset()
      .query(queryParam)
      .count()
      .then(({ assets }: any) => assets)
      .catch((err) => {
        log(this.exportConfig, "Get count query failed", "error");
        log(this.exportConfig, err, "error");
      });
  }

  /**
   * @method downloadAssets
   * @returns Promise<any|void>
   */
  async downloadAssets(): Promise<any | void> {
    const self = this;
    const fs = new FsUtility();
    const downloadedAssetsDirs = await getDirectories(
      pResolve(this.assetsRootPath, "files")
    );
    const downloadedAssetsName = await getFileList(
      pResolve(this.assetsRootPath, "files")
    );
    let assetsMetaData = new FsUtility({
      fileExt: "json",
      basePath: this.assetsRootPath,
    }).getPlainMeta();

    let listOfAssets = values(assetsMetaData).flat();

    if (this.assetConfig.includeVersionedAssets) {
      let versionedAssetsMetaData = new FsUtility({
        fileExt: "json",
        basePath: pResolve(this.assetsRootPath, "versions"),
      }).getPlainMeta();

      listOfAssets.push(...values(versionedAssetsMetaData).flat());
    }

    const apiBatches: Array<any> = chunk(
      listOfAssets,
      this.assetConfig.downloadLimit
    );

    const onSuccess = ({ response: { data }, additionalInfo }: any) => {
      const { asset } = additionalInfo;
      const assetFolderPath = pResolve(self.assetsRootPath, "files", asset.uid);
      const assetFilePath = pResolve(assetFolderPath, asset.filename);
      fs.createFolderIfNotExist(assetFolderPath);
      const assetFileStream = createWriteStream(assetFilePath);
      assetFileStream
        .on("close", function () {
          log(
            self.exportConfig,
            `Downloaded ${asset.filename}: ${asset.uid} successfully!`,
            "success"
          );
        })
        .on("error", (error) => {
          log(
            self.exportConfig,
            `Downloaded failed ${asset.filename}: ${asset.uid}!`,
            "error"
          );
          log(self.exportConfig, error, "error");
        });
      data.pipe(assetFileStream);
    };

    const onReject = ({ error, additionalInfo }: any) => {
      const { asset } = additionalInfo;
      log(
        this.exportConfig,
        `Downloaded failed ${asset.filename}: ${asset.uid}!`,
        "error"
      );
      log(this.exportConfig, error, "error");
    };

    const promisifyHandler: CustomPromiseHandler = (
      input: CustomPromiseHandlerInput
    ) => {
      const { index, batchIndex } = input;
      const asset: any = apiBatches[batchIndex][index];

      if (
        includes(downloadedAssetsDirs, asset.uid) &&
        includes(downloadedAssetsName, asset.filename)
      ) {
        log(
          self.exportConfig,
          `Skipping download of { title: ${asset.filename}, uid: ${asset.uid} }, as they already exist`,
          "success"
        );

        return Promise.resolve();
      }

      return self.makeAPICall({
        url: asset.url,
        reject: onReject,
        resolve: onSuccess,
        module: "download-asset",
        additionalInfo: { asset },
      });
    };

    return this.makeConcurrentCall(
      {
        apiBatches,
        module: "assets download",
        totalCount: listOfAssets.length,
        concurrencyLimit: this.assetConfig.downloadLimit,
      },
      promisifyHandler
    ).then(() => {
      log(
        this.exportConfig,
        "Assets download completed successfully.!",
        "info"
      );
    });
  }
}
