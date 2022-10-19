const path = require('path');
const fileHelper = require('../util/helper');
const { executeTask } = require('../util');
const { addlogs } = require('../util/log');

class ContentTypesExport {
  constructor(stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.contentTypesConfig = exportConfig.modules.content_types;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
      limit: this.contentTypesConfig.limit,
      include_global_field_schema: true,
    };
    // If content type id is provided then use it as part of query
    if (Array.isArray(this.exportConfig.contentTypes) && this.exportConfig.length > 0) {
      this.qs.uid = { $in: this.exportConfig.contentTypes };
    }
    this.contentTypesPath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.contentTypesConfig.dirName,
    );
    this.contentTypes = [];
    this.fetchConcurrency = this.contentTypesConfig.fetchConcurrency || this.exportConfig.fetchConcurrency;
    this.writeConcurrency = this.contentTypesConfig.fetchConcurrency || this.exportConfig.fetchConcurrency;
  }

  async start() {
    addlogs(config, 'Starting content type export', 'success');
    await fileHelper.makeDirectory(this.contentTypesPath);
    await this.getContentTypes();
    await this.writeContentTypes();
    addlogs(config, chalk.green('Content type(s) exported successfully'), 'success');
  }

  async getContentTypes(skip = 0) {
    if (skip) {
      this.qs.skip = skip;
    }

    const contentTypeSearchResponse = await this.stackAPIClient.contentType().query(this.qs).find();
    if (Array.isArray(contentTypeSearchResponse.items) && contentTypeSearchResponse.items.length > 0) {
      let updatedContentTypes = this.sanitizeAttribs(contentTypeSearchResponse.items);
      this.contentTypes.push(...updatedContentTypes);

      skip += this.contentTypesConfig.limit;
      if (skip > contentTypeSearchResponse.count) {
        return;
      }
      return await this.getContentTypes(skip);
    } else {
      console.log('No content types returned for the given query');
    }
  }

  sanitizeAttribs(contentTypes) {
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

  async writeContentTypes(contentTypes) {
    function write(contentType) {
      return fileHelper.writeFile(path.join(this.contentTypesPath, contentType.uid + '.json'), contentType);
    }
    await executeTask(contentTypes, write, { concurrency: writeConcurrency });
    return fileHelper.writeFile(path.join(this.contentTypesPath, 'schema.json'), contentTypes);
  }
}

module.exports = ContentTypesExport;
