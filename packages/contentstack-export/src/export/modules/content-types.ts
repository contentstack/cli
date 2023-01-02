import * as path from 'path';
import * as pLimit from 'promise-limit';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class ContentTypesExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private contentTypesConfig: any;
  private contentTypesPath: string;
  private fileWriteConcurrency: number;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.contentTypesConfig = exportConfig.moduleLevelConfig.contentTypes;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      limit: this.contentTypesConfig.limit,
      include_global_field_schema: true,
    };
    this.contentTypesPath = path.resolve(
      exportConfig.branchDir || exportConfig.exportDir,
      this.contentTypesConfig.dirName,
    );
    this.fileWriteConcurrency = 2;
  }

  async start() {
    // get content types
    // sanitize
    // write content type
    try {
      await fileHelper.makeDirectory(this.contentTypesPath);
      const contentTypes = await this.getContentTypes();
      await this.writeContentTypes(contentTypes);
      console.log('completed content type export');
    } catch (error) {
      logger.error('error in content type export', error);
    }
  }

  async getContentTypes(skip = 0, contentTypes = []): Promise<any> {
    if (skip) {
      this.qs.skip = skip;
    }

    const contentTypeSearchResponse = await this.stackAPIClient.contentType().query(this.qs).find();
    if (Array.isArray(contentTypeSearchResponse.items) && contentTypeSearchResponse.items.length > 0) {
      let updatedContentTypes = this.sanitizeAttribs(contentTypeSearchResponse.items);
      contentTypes.push(...updatedContentTypes);

      skip += this.contentTypesConfig.limit;
      if (skip > contentTypeSearchResponse.count) {
        return contentTypes;
      }
      return await this.getContentTypes(skip, contentTypes);
    } else {
      console.log('No content types returned for the given query');
    }
    return contentTypes;
  }

  sanitizeAttribs(contentTypes: Array<object>): Array<any> {
    let updatedContentTypes = [];
    contentTypes.forEach((contentType) => {
      for (let key in contentType) {
        if (this.contentTypesConfig.validKeys.indexOf(key) === -1) {
          delete contentType[key];
        }
      }
      updatedContentTypes.push(contentType);
    });
    return updatedContentTypes;
  }

  async writeContentTypes(contentTypes: Array<any>) {
    const promiseRunner = pLimit(this.fileWriteConcurrency);
    await Promise.all(
      contentTypes.map((contentType) =>
        promiseRunner(() =>
          fileHelper.writeFile(path.join(this.contentTypesPath, contentType.uid + '.json'), contentType),
        ),
      ),
    );
    fileHelper.writeFile(path.join(this.contentTypesPath, 'schema.json'), contentTypes);
  }
}
