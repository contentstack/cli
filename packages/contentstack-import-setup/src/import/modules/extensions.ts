import * as chalk from 'chalk';
import { fsUtil, fileHelper } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty } from 'lodash';
import { formatError, sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';

export default class ExtensionImportSetup {
  private config: ImportConfig;
  private extensionsFilePath: string;
  private extensionMapper: Record<string, string>;
  private stackAPIClient: ModuleClassParams['stackAPIClient'];
  private dependencies: ModuleClassParams['dependencies'];
  private extensionsConfig: ImportConfig['modules']['extensions'];
  private mapperDirPath: string;
  private extensionsFolderPath: string;
  private extUidMapperPath: string;

  constructor({ config, stackAPIClient, dependencies }: ModuleClassParams) {
    this.config = config;
    if (this.config.context) {
      this.config.context.module = 'extensions';
    }
    this.stackAPIClient = stackAPIClient;
    this.extensionsFilePath = join(sanitizePath(this.config.contentDir), 'extensions', 'extensions.json');
    this.extensionsConfig = config.modules.extensions;
    this.extUidMapperPath = join(sanitizePath(this.config.backupDir), 'mapper', 'extensions', 'uid-mapping.json');
    this.extensionMapper = {};
  }

  /**
   * Start the extension import setup
   * This method reads the extensions from the content folder and generates a mapper file
   * @returns {Promise<void>}
   */
  async start() {
    try {
      if (!fileHelper.fileExistsSync(this.extensionsFilePath)) {
        log.info('No extensions found in the content folder.');
        return;
      }
      const extensions: any = await fsUtil.readFile(this.extensionsFilePath);
      if (!isEmpty(extensions)) {
        // 2. Create mapper directory
        const mapperFilePath = join(sanitizePath(this.config.backupDir), 'mapper', 'extensions');
        fsUtil.makeDirectory(mapperFilePath); // Use fsUtil

        for (const extension of Object.values(extensions) as any) {
          const targetExtension: any = await this.getExtension(extension);
          if (!targetExtension) {
            log.info(`Extension with the title '${extension.title}' not found in the stack.`);
            continue;
          }
          this.extensionMapper[extension.uid] = targetExtension.uid;
        }

        await fsUtil.writeFile(this.extUidMapperPath, this.extensionMapper);

        log.success(`The required setup files for extensions have been generated successfully.`);
      } else {
        log.info('No extensions found in the content folder.');
      }
    } catch (error) {
      handleAndLogError(error, { ...this.config.context }, 'Error occurred while generating the extension mapper');
    }
  }

  async getExtension(extension: any) {
    // Implement this method to get the extension from the stack
    return new Promise(async (resolve, reject) => {
      const { items: [extensionsInStack] = [] } =
        (await this.stackAPIClient
          .extension()
          .query({ query: { title: extension.title } })
          .findOne()
          .catch((error: Error) => {
            reject(error);
          })) || {};
      resolve(extensionsInStack);
    });
  }
}
