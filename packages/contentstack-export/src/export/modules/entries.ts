import * as path from 'path';
import * as pLimit from 'promise-limit';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class EntriesExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private entriesConfig: any;
  private entriesRootPath: string;
  private localesFilePath: string;
  private schemaFilePath: string;
  private fileWriteConcurrency: number;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.entriesConfig = exportConfig.moduleLevelConfig.entries;
    this.entriesRootPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.entriesConfig.dirName);
    this.localesFilePath = path.resolve(
      exportConfig.branchDir || exportConfig.exportDir,
      exportConfig.moduleLevelConfig.locales.dirName,
      exportConfig.moduleLevelConfig.locales.fileName,
    );
    this.schemaFilePath = path.resolve(
      exportConfig.branchDir || exportConfig.exportDir,
      exportConfig.moduleLevelConfig.contentTypes.dirName,
      'schema.json',
    );
    this.fileWriteConcurrency = 2;
  }

  async start() {
    // read locales
    // read schema
    // create api bucket
    // get entries recursive, if versioning enabled get entries by versions
    // write it while getting it

    // get all the entries of a bucket and write it into a file
    // if versioning enabled
    // get the versions and write those as well

    try {
      const locales = await fileHelper.readJSONFile(this.localesFilePath);
      const contentTypes = await fileHelper.readJSONFile(this.schemaFilePath);
      if (contentTypes.length === 0) {
        logger.error('No content types found to export entries');
        return;
      }
      const entryRequestOptions = this.createRequestObjects(locales, contentTypes);
      for (let requestOption of entryRequestOptions) {
        await fileHelper.makeDirectory(path.join(this.entriesRootPath, requestOption.content_type));
        const entries = await this.getEntries(requestOption);
        let entriesFilePath = path.join(
          this.entriesRootPath,
          requestOption.content_type,
          requestOption.locale + '.json',
        );
        await fileHelper.writeFile(entriesFilePath, entries);
        if (this.exportConfig.versioning) {
          const promiseRunner = pLimit(this.fileWriteConcurrency);
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
              await Promise.all(
                versionedEntries.map((versionedEntry) =>
                  promiseRunner(() =>
                    fileHelper.writeFile(
                      path.join(versionedEntryPath, 'version-' + versionedEntry._version + '.json'),
                      versionedEntry,
                    ),
                  ),
                ),
              );
            }
          }
        }
      }

      console.log('Completed the entries export');
    } catch (error) {
      console.log('Error in entry export', error);
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
      skip += this.entriesConfig.limit;
      if (skip > entriesSearchResponse.count) {
        return entries;
      }
      return await this.getEntries(requestOptions, skip, entries);
    } else {
      console.log('No entries returned for the given query');
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

  createRequestObjects(locales, contentTypes): Array<any> {
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
        locale: this.exportConfig.masterLocale,
      });
    });

    return requestObjects;
  }

  sanitizeAttribs(entries: Array<any>, entriesList = {}): Object {
    entries.forEach((entry) => {
      for (let key in entry) {
        if (this.entriesConfig.invalidKeys.indexOf(key) !== -1) {
          delete entry[key];
        }
      }
      entriesList[entry.uid] = entry;
    });
    return entriesList;
  }
}
