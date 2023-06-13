const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { cloneDeep, find, findIndex } = require('lodash');

const fileHelper = require('../util/fs');
const { addlogs } = require('../util/log');
const supress = require('../util/extensionsUidReplace');
const { executeTask, formatError } = require('../util');
const schemaTemplate = require('../util/schemaTemplate');

class ContentTypesImport {
  constructor(importConfig, stackAPIClient) {
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
    this.contentTypeConfig = importConfig.modules.content_types;
    this.globalFieldConfig = importConfig.modules.globalfields;
    this.importConcurrency = this.contentTypeConfig.importConcurrency || this.importConfig.importConcurrency;
    this.writeConcurrency = this.contentTypeConfig.writeConcurrency || this.importConfig.writeConcurrency;
    this.contentTypesFolderPath = path.join(this.importConfig.data, this.contentTypeConfig.dirName);
    this.mapperFolderPath = path.join(this.importConfig.data, 'mapper', 'content_types');
    this.existingContentTypesPath = path.join(this.mapperFolderPath, 'success.json');
    this.globalFieldsFolderPath = path.resolve(this.importConfig.data, this.globalFieldConfig.dirName);
    this.globalFieldMapperFolderPath = path.join(importConfig.data, 'mapper', 'global_fields', 'success.json');
    this.globalFieldPendingPath = path.join(importConfig.data, 'mapper', 'global_fields', 'pending_global_fields.js');
    this.ignoredFilesInContentTypesFolder = new Map([
      ['__master.json', 'true'],
      ['__priority.json', 'true'],
      ['schema.json', 'true'],
      ['.DS_Store', 'true'],
    ]);
    this.contentTypes = [];
    this.existingContentTypesUIds = [];
    this.titleToUIdMap = new Map();
    this.requestOptions = {
      json: {},
    };
    this.fieldRules = [];
    this.installedExtensions = [];
    this.globalFields = [];
    this.existingGlobalFields = [];
    this.pendingGlobalFields = [];
  }

  async start() {
    try {
      const appMapperPath = path.join(this.importConfig.data, 'mapper', 'marketplace_apps', 'uid-mapping.json');
      this.installedExtensions = (
        (await fileHelper.readFileSync(appMapperPath)) || { extension_uid: {} }
      ).extension_uid;
      // read content types
      // remove content types already existing
      if (fs.existsSync(this.existingContentTypesPath)) {
        this.existingContentTypesUIds = fileHelper.readFileSync(this.existingContentTypesPath) || [];
        this.existingContentTypesUIds = new Map(this.existingContentTypesUIds.map((id) => [id, 'true']));
      }

      const contentTypeFiles = fileHelper.readdirSync(this.contentTypesFolderPath);
      for (let contentTypeName of contentTypeFiles) {
        if (!this.ignoredFilesInContentTypesFolder.has(contentTypeName)) {
          const contentTypePath = path.join(this.contentTypesFolderPath, contentTypeName);
          const contentType = await fileHelper.readFile(contentTypePath);
          if (!this.existingContentTypesUIds.length || !this.existingContentTypesUIds.has(contentType.uid)) {
            this.contentTypes.push(await fileHelper.readFile(contentTypePath));
          }
        }
      }

      // seed content type
      addlogs(this.importConfig, 'Started to seed content types', 'info');
      await executeTask(this.seedContentType.bind(this), { concurrency: this.importConcurrency }, this.contentTypes);
      addlogs(this.importConfig, 'Created content types', 'success');

      addlogs(this.importConfig, 'Started to update content types with references', 'info');
      await executeTask(this.updateContentType.bind(this), { concurrency: this.importConcurrency }, this.contentTypes);
      addlogs(this.importConfig, 'Updated content types with references', 'success');

      // global field update
      this.pendingGlobalFields = fileHelper.readFileSync(this.globalFieldPendingPath);
      if (Array.isArray(this.pendingGlobalFields) && this.pendingGlobalFields.length > 0) {
        this.globalFields = fileHelper.readFileSync(
          path.resolve(this.globalFieldsFolderPath, this.globalFieldConfig.fileName),
        );
        this.existingGlobalFields = fileHelper.readFileSync(this.globalFieldMapperFolderPath);
        try {
          addlogs(this.importConfig, 'Started to update pending global field with content type references', 'info');
          await executeTask(
            this.updateGlobalFields.bind(this),
            {
              concurrency: this.importConcurrency,
            },
            this.pendingGlobalFields,
          );
          addlogs(this.importConfig, 'Updated pending global fields with content type with references', 'success');
        } catch (error) {
          addlogs(
            this.importConfig,
            `Failed to updates global fields with content type reference ${formatError(error)}`,
            'error',
          );
        }
      }

      // write field rules
      if (this.fieldRules.length > 0) {
        try {
          await fileHelper.writeFile(path.join(this.contentTypesFolderPath, 'field_rules_uid.json'), this.fieldRules);
        } catch (error) {
          addlogs(this.importConfig, `Failed to write field rules ${formatError(error)}`, 'error');
        }
      }

      addlogs(this.importConfig, chalk.green('Content types imported successfully'), 'success');
    } catch (error) {
      addlogs(this.importConfig, formatError(error), 'error');
      throw new Error('Failed to import content types');
    }
  }

  async seedContentType(contentType) {
    const body = cloneDeep(schemaTemplate);
    body.content_type.uid = contentType.uid;
    body.content_type.title = contentType.title;
    const requestObject = cloneDeep(this.requestOptions);
    requestObject.json = body;

    try {
      await this.stackAPIClient.contentType().create(requestObject.json);
    } catch (error) {
      if (error.errorCode === 115 && (error.errors.uid || error.errors.title)) {
        // content type uid already exists
        // _.remove(self.contentTypes, { uid: uid });
        return true;
      }
      throw error;
    }
  }

  async updateContentType(contentType) {
    if (typeof contentType !== 'object') return;
    const requestObject = cloneDeep(this.requestOptions);
    if (contentType.field_rules) {
      this.fieldRules.push(contentType.uid);
      delete contentType.field_rules;
    }

    supress(contentType.schema, this.importConfig.preserveStackVersion, this.installedExtensions);
    requestObject.json.content_type = contentType;
    const contentTypeResponse = this.stackAPIClient.contentType(contentType.uid);
    Object.assign(contentTypeResponse, cloneDeep(contentType));
    await contentTypeResponse.update();
    addlogs(this.importConfig, `'${contentType.uid}' updated with references`, 'success');
  }

  async updateGlobalFields(uid) {
    const globalField = find(this.globalFields, { uid });
    if (globalField) {
      supress(globalField.schema, this.importConfig.preserveStackVersion, this.installedExtensions);
      let globalFieldObj = this.stackAPIClient.globalField(globalField.uid);
      Object.assign(globalFieldObj, cloneDeep(globalField));
      try {
        const globalFieldResponse = await globalFieldObj.update();
        const existingGlobalField = findIndex(this.existingGlobalFields, (existingGlobalFieldUId) => {
          return globalFieldResponse.uid === existingGlobalFieldUId;
        });

        // Improve write the updated global fields once all updates are completed
        this.existingGlobalFields.splice(existingGlobalField, 1, globalField);
        await fileHelper.writeFile(this.globalFieldMapperFolderPath, this.existingGlobalFields).catch((error) => {
          addlogs(this.importConfig, `failed to write updated the global field '${uid}'. ${formatError(error)}`);
        });
        addlogs(this.importConfig, `Updated the global field '${uid}' with content type references `);
        return true;
      } catch (error) {
        addlogs(this.importConfig, `failed to update the global field '${uid}'. ${formatError(error)}`);
      }
    } else {
      addlogs(this.importConfig, `Global field '${uid}' does not exist, and hence failed to update.`);
    }
  }

  async mapUidToTitle() {
    this.contentTypes.forEach((ct) => {
      this.titleToUIdMap.set(ct.uid, ct.title);
    });
  }
}

module.exports = ContentTypesImport;
