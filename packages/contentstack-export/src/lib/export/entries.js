const path = require('path');
const chalk = require('chalk');
const { addlogs } = require('../util/log');
const fileHelper = require('../util/helper');
const { executeTask, formatError } = require('../util');

class EntriesExport {
  constructor(exportConfig, stackAPIClient) {
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.entriesConfig = exportConfig.modules.entries;
    this.entriesRootPath = path.resolve(exportConfig.data, exportConfig.branchName || '', this.entriesConfig.dirName);
    this.localesFilePath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      exportConfig.modules.locales.dirName,
      exportConfig.modules.locales.fileName,
    );
    this.schemaFilePath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      exportConfig.modules.content_types.dirName,
      'schema.json',
    );
    this.fetchConcurrency = this.entriesConfig.fetchConcurrency || exportConfig.fetchConcurrency;
    this.writeConcurrency = this.entriesConfig.writeConcurrency || exportConfig.writeConcurrency;
  }

  async start() {
    try {
      addlogs(this.exportConfig, 'Starting entries export', 'info');
      const locales = await fileHelper.readFile(this.localesFilePath);
      const contentTypes = await fileHelper.readFile(this.schemaFilePath);
      if (contentTypes.length === 0) {
        addlogs(this.exportConfig, 'No content types found to export entries', 'info');
        return;
      }
      const entryRequestOptions = this.createRequestObjects(locales, contentTypes);
      for (let requestOption of entryRequestOptions) {
        addlogs(
          this.exportConfig,
          `Starting export of entries of content_type - ${requestOption.content_type} locale - ${requestOption.locale}`,
          'info',
        );
        await fileHelper.makeDirectory(path.join(this.entriesRootPath, requestOption.content_type));
        const entries = await this.getEntries(requestOption);
        let entriesFilePath = path.join(
          this.entriesRootPath,
          requestOption.content_type,
          requestOption.locale + '.json',
        );
        await fileHelper.writeLargeFile(entriesFilePath, entries);
        addlogs(
          this.exportConfig,
          `Exported entries of type '${requestOption.content_type}' locale '${requestOption.locale}'`,
          'success',
        );
        if (this.exportConfig.versioning) {
          addlogs(
            this.exportConfig,
            `Started export versioned entries of type '${requestOption.content_type}' locale '${requestOption.locale}'`,
            'info',
          );
          for (let entry of entries) {
            const versionedEntries = await this.getEntryByVersion(
              {
                ...requestOption,
                uid: entry.uid,
              },
              entry._version,
            );
            let versionedEntryPath = path.join(
              this.entriesRootPath,
              requestOption.locale,
              requestOption.content_type,
              entry.uid,
            );
            await fileHelper.makeDirectory(versionedEntryPath);
            if (versionedEntries.length > 0) {
              const write = (versionedEntry) =>
                fileHelper.writeFile(
                  path.join(versionedEntryPath, 'version-' + versionedEntry._version + '.json'),
                  versionedEntry,
                );
              await executeTask(versionedEntries, write.bind(this), { concurrency: this.writeConcurrency });
              addlogs(
                this.exportConfig,
                `Exported versioned entries of type '${requestOption.content_type}' locale '${requestOption.locale}'`,
                'success',
              );
            }
          }
        }
      }
      addlogs(this.exportConfig, chalk.green('Entries exported successfully'), 'success');
    } catch (error) {
      addlogs(this.exportConfig, `Failed to export entries ${formatError(error)}`, 'error');
      throw new Error('Failed to export entries');
    }
  }

  async getEntries(requestOptions, skip = 0, entries = {}) {
    let requestObject = {
      locale: requestOptions.locale,
      skip,
      limit: this.entriesConfig.limit,
      include_count: true,
      include_publish_details: true,
      query: {
        locale: requestOptions.locale,
      },
    };

    const entriesSearchResponse = await this.stackAPIClient
      .contentType(requestOptions.content_type)
      .entry()
      .query(requestObject)
      .find();

    if (Array.isArray(entriesSearchResponse.items) && entriesSearchResponse.items.length > 0) {
      // clean up attribs and add to parent entry list
      this.sanitizeAttribs(entriesSearchResponse.items, entries);
      skip += this.entriesConfig.limit || 100;
      if (skip > entriesSearchResponse.count) {
        return entries;
      }
      return await this.getEntries(requestOptions, skip, entries);
    }
    return entries;
  }

  async getEntryByVersion(requestOptions, version, entries = []) {
    const queryRequestObject = {
      locale: requestOptions.locale,
      except: {
        BASE: this.entriesConfig.invalidKeys,
      },
      version,
    };
    const entryResponse = await this.stackAPIClient
      .contentType(requestOptions.content_type)
      .entry(requestOptions.uid)
      .fetch(queryRequestObject);
    entries.push(entryResponse);
    if (--version > 0) {
      return await this.getEntryByVersion(requestOptions, version, entries);
    }
    return entries;
  }

  async getEntriesCount(requestOptions) {
    let requestObject = {
      locale: requestOptions.locale,
      limit: 1,
      include_count: true,
      include_publish_details: true,
      query: {
        locale: requestOptions.locale,
      },
    };

    const entriesSearchResponse = await this.stackAPIClient
      .contentType(requestOptions.content_type)
      .entry()
      .query(requestObject)
      .find();

    return entriesSearchResponse.count;
  }

  createRequestObjects(locales, contentTypes) {
    let requestObjects = [];
    contentTypes.forEach((contentType) => {
      if (Object.keys(locales).length !== 0) {
        for (let locale in locales) {
          requestObjects.push({
            content_type: contentType.uid,
            locale: locales[locale].code,
          });
        }
      }
      requestObjects.push({
        content_type: contentType.uid,
        locale: this.exportConfig.master_locale.code,
      });
    });

    return requestObjects;
  }

  sanitizeAttribs(entries, entriesList = {}) {
    entries.forEach((entry) => {
      this.entriesConfig.invalidKeys.forEach((key) => delete entry[key]);
      entriesList[entry.uid] = entry;
    });
    return entriesList;
  }
}

module.exports = EntriesExport;
