const path = require('path');
const chalk = require('chalk');
const { fileHelper, executeTask, formatError, log } = require('../../utils');
const { sanitizePath } = require('@contentstack/cli-utilities');

class ContentTypesExport {
  constructor(exportConfig, stackAPIClient) {
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
    if (Array.isArray(this.exportConfig.contentTypes) && this.exportConfig.contentTypes.length > 0) {
      this.qs.uid = { $in: this.exportConfig.contentTypes };
    }
    this.contentTypesPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName) || '',
      sanitizePath(this.contentTypesConfig.dirName),
    );
    this.contentTypes = [];
    this.fetchConcurrency = this.contentTypesConfig.fetchConcurrency || this.exportConfig.fetchConcurrency;
    this.writeConcurrency = this.contentTypesConfig.writeConcurrency || this.exportConfig.writeConcurrency;
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting content type export', 'success');
      await fileHelper.makeDirectory(this.contentTypesPath);
      await this.getContentTypes();
      await this.writeContentTypes(this.contentTypes);
      log(this.exportConfig, chalk.green('Content type(s) exported successfully'), 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export content types ${formatError(error)}`, 'error');
      throw new Error('Failed to export content types');
    }
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
      log(this.exportConfig, 'No content types returned for the given query', 'info');
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
      return fileHelper.writeFile(
        path.join(sanitizePath(this.contentTypesPath), `${sanitizePath  (contentType.uid === 'schema' ? 'schema|1' : contentType.uid)}.json`),
        contentType,
      );
    }
    await executeTask(contentTypes, write.bind(this), { concurrency: this.writeConcurrency });
    return fileHelper.writeFile(path.join(this.contentTypesPath, 'schema.json'), contentTypes);
  }
}

module.exports = ContentTypesExport;
