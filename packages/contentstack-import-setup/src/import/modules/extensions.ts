import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty } from 'lodash';
import { formatError } from '@contentstack/cli-utilities';

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

  constructor({ config, stackAPIClient }: ModuleClassParams) {
    this.config = config;
    this.stackAPIClient = stackAPIClient;
    this.extensionsFilePath = join(this.config.contentDir, 'extensions', 'extensions.json');
    this.extensionsConfig = config.modules.extensions;
    this.extUidMapperPath = join(this.config.backupDir, 'mapper', 'extensions', 'uid-mapping.json');
    this.extensionMapper = {};
  }

  /**
   * Start the extension import setup
   * This method reads the extensions from the content folder and generates a mapper file
   * @returns {Promise<void>}
   */
  async start() {
    try {
      const extensions: any = await fsUtil.readFile(this.extensionsFilePath);
      if (!isEmpty(extensions)) {
        // 2. Create mapper directory
        const mapperFilePath = join(this.config.backupDir, 'mapper', 'extensions');
        fsUtil.makeDirectory(mapperFilePath); // Use fsUtil

        for (const extension of Object.values(extensions) as any) {
          const targetExtension: any = await this.getExtension(extension);
          if (!targetExtension) {
            log(this.config, `Extension with title '${extension.title}' not found in the stack!`, 'error');
            continue;
          }
          this.extensionMapper[extension.uid] = targetExtension.uid;
        }

        await fsUtil.writeFile(this.extUidMapperPath, this.extensionMapper);

        log(this.config, `Generated required setup files for extension`, 'success');
      } else {
        log(this.config, 'No extensions found in the content folder!', 'error');
      }
    } catch (error) {
      log(this.config, `Error generating extension mapper: ${formatError(error)}`, 'error');
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
