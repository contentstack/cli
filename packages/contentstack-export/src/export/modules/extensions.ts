import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';

export default class ExtensionExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private extensionConfig: any;
  private extensionPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.extensionConfig = exportConfig.moduleLevelConfig.extensions;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
    };
    this.extensionPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.extensionConfig.dirName);
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.extensionPath);
      const locales = await this.getExtensions();
      await fileHelper.writeFile(path.join(this.extensionPath, this.extensionConfig.fileName), locales);
      console.log('completed extension export');
    } catch (error) {
      logger.error('error in extension export', error);
    }
  }

  async getExtensions() {
    let extensions = await this.stackAPIClient.query().query(this.qs).find();
    if (Array.isArray(extensions.items) && extensions.items.length > 0) {
      let updatedExtensions = this.sanitizeAttribs(extensions.items);
      return updatedExtensions;
    }
    logger.info('No Extensions found');
  }

  sanitizeAttribs(extensions) {
    let updatedExtensions = {};
    extensions.forEach((extension) => {
      for (let key in extension) {
        if (this.extensionConfig.requiredKeys.indexOf(key) === -1) {
          delete extension.SYS_ACL;
        }
      }
      updatedExtensions[extension.uid] = extension;
    });
    return updatedExtensions;
  }
}
