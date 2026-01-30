import * as chalk from 'chalk';
import { log, fsUtil } from '../../utils';
import { join } from 'path';
import { ImportConfig, ModuleClassParams } from '../../types';
import { isEmpty } from 'lodash';
import { formatError, sanitizePath } from '@contentstack/cli-utilities';
import BaseImportSetup from './base-setup';
import { MODULE_NAMES, MODULE_CONTEXTS, PROCESS_NAMES, PROCESS_STATUS } from '../../utils';

export default class ExtensionImportSetup extends BaseImportSetup {
  private extensionsFilePath: string;
  private extensionMapper: Record<string, string>;
  private extensionsConfig: ImportConfig['modules']['extensions'];
  private extensionsFolderPath: string;
  private extUidMapperPath: string;

  constructor({ config, stackAPIClient }: ModuleClassParams) {
    super({ config, stackAPIClient, dependencies: [] });
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.EXTENSIONS];
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
      const extensions: any = await this.withLoadingSpinner('EXTENSIONS: Analyzing import data...', async () => {
        return await fsUtil.readFile(this.extensionsFilePath);
      });

      if (!isEmpty(extensions)) {
        const extensionsArray = Object.values(extensions) as any[];
        const progress = this.createNestedProgress(this.currentModuleName);
        
        // Add process
        progress.addProcess(PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION, extensionsArray.length);

        // Create mapper directory
        const mapperFilePath = join(sanitizePath(this.config.backupDir), 'mapper', 'extensions');
        fsUtil.makeDirectory(mapperFilePath);

        progress
          .startProcess(PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION)
          .updateStatus(
            PROCESS_STATUS.EXTENSIONS_MAPPER_GENERATION.GENERATING,
            PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION,
          );

        for (const extension of extensionsArray) {
          try {
            const targetExtension: any = await this.getExtension(extension);
            if (!targetExtension) {
              log(this.config, `Extension with the title '${extension.title}' not found in the stack.`, 'info');
              this.progressManager?.tick(false, `extension: ${extension.title}`, 'Not found in stack', PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION);
              continue;
            }
            this.extensionMapper[extension.uid] = targetExtension.uid;
            this.progressManager?.tick(true, `extension: ${extension.title}`, null, PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION);
          } catch (error) {
            this.progressManager?.tick(false, `extension: ${extension.title}`, formatError(error), PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION);
          }
        }

        await fsUtil.writeFile(this.extUidMapperPath, this.extensionMapper);
        progress.completeProcess(PROCESS_NAMES.EXTENSIONS_MAPPER_GENERATION, true);
        this.completeProgress(true);

        log(this.config, `The required setup files for extensions have been generated successfully.`, 'success');
      } else {
        log(this.config, 'No extensions found in the content folder.', 'info');
      }
    } catch (error) {
      this.completeProgress(false, error?.message || 'Extensions mapper generation failed');
      log(this.config, `Error occurred while generating the extension mapper: ${formatError(error)}.`, 'error');
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
