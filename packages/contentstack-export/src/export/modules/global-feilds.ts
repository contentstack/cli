import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';

export default class GlobalFieldExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private globalFieldConfig: any;
  private globalFieldPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.globalFieldConfig = exportConfig.moduleLevelConfig.globalFields;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      limit: this.globalFieldConfig.limit,
    };
    this.globalFieldPath = path.resolve(
      exportConfig.branchDir || exportConfig.exportDir,
      this.globalFieldConfig.dirName,
    );
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.globalFieldPath);
      const locales = await this.getExtensions();
      await fileHelper.writeFile(path.join(this.globalFieldPath, this.globalFieldConfig.fileName), locales);
      console.log('completed globalField export');
    } catch (error) {
      logger.error('error in globalField export', error);
    }
  }

  async getExtensions(skip = 0, globalFields = []) {
    let globalFieldSearchResponse = await this.stackAPIClient.query().query(this.qs).find();
    if (Array.isArray(globalFieldSearchResponse.items) && globalFieldSearchResponse.items.length > 0) {
      let updatedGlobalFields = this.sanitizeAttribs(globalFieldSearchResponse.items);
      globalFields.push(...updatedGlobalFields);
      skip += this.globalFieldConfig.limit;
      if (skip > globalFieldSearchResponse.count) {
        return globalFields;
      }
      return await this.getExtensions(skip, globalFields);
    } else {
      logger.error('no globalfield found for the given query');
    }

    return globalFields;
  }

  sanitizeAttribs(globalFields) {
    globalFields = globalFields.map((globalField) => {
      for (let key in globalField) {
        if (this.globalFieldConfig.validKeys.indexOf(key) === -1) {
          delete globalField[key];
        }
      }
      return globalField;
    });
    return globalFields;
  }
}
