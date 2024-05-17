const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { cloneDeep, find, findIndex } = require('lodash');
const { fileHelper, log, executeTask, formatError, schemaTemplate, lookupExtension } = require('../../utils');
const { sanitizePath } = require('@contentstack/cli-utilities');

class ContentTypesImport {
  constructor(importConfig, stackAPIClient) {
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
    this.contentTypeConfig = importConfig.modules.content_types;
    this.globalFieldConfig = importConfig.modules.globalfields;
    this.importConcurrency = this.contentTypeConfig.importConcurrency || this.importConfig.importConcurrency;
    this.writeConcurrency = this.contentTypeConfig.writeConcurrency || this.importConfig.writeConcurrency;
    this.contentTypesFolderPath = path.join(sanitizePath(this.importConfig.data), sanitizePath(this.contentTypeConfig.dirName));
    this.mapperFolderPath = path.join(sanitizePath(this.importConfig.data), 'mapper', 'content_types');
    this.existingContentTypesPath = path.join(sanitizePath(this.mapperFolderPath), 'success.json');
    this.globalFieldsFolderPath = path.resolve(sanitizePath(this.importConfig.data),sanitizePath(this.globalFieldConfig.dirName));
    this.globalFieldMapperFolderPath = path.join(sanitizePath(importConfig.data), 'mapper', 'global_fields', 'success.json');
    this.globalFieldPendingPath = path.join(sanitizePath(importConfig.data), 'mapper', 'global_fields', 'pending_global_fields.js');
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
      log(this.importConfig, 'Started to seed content types', 'info');
      await executeTask(this.contentTypes, this.seedContentType.bind(this), { concurrency: this.importConcurrency });
      log(this.importConfig, 'Created content types', 'success');

      log(this.importConfig, 'Started to update content types with references', 'info');
      await executeTask(this.contentTypes, this.updateContentType.bind(this), { concurrency: this.importConcurrency });
      log(this.importConfig, 'Updated content types with references', 'success');

      // global field update
      this.pendingGlobalFields = fileHelper.readFileSync(this.globalFieldPendingPath);
      if (Array.isArray(this.pendingGlobalFields) && this.pendingGlobalFields.length > 0) {
        this.globalFields = fileHelper.readFileSync(
          path.resolve(this.globalFieldsFolderPath, this.globalFieldConfig.fileName),
        );
        this.existingGlobalFields = fileHelper.readFileSync(this.globalFieldMapperFolderPath);
        try {
          log(this.importConfig, 'Started to update pending global field with content type references', 'info');
          await executeTask(this.pendingGlobalFields, this.updateGlobalFields.bind(this), {
            concurrency: this.importConcurrency,
          });
          log(this.importConfig, 'Updated pending global fields with content type with references', 'success');
        } catch (error) {
          log(
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
          log(this.importConfig, `Failed to write field rules ${formatError(error)}`, 'success');
        }
      }

      log(this.importConfig, chalk.green('Content types imported successfully'), 'success');
    } catch (error) {
      let message_content_type = "";
      if (error.request !== undefined && JSON.parse(error.request.data).content_type !== undefined) {
        if (JSON.parse(error.request.data).content_type.uid) {
          message_content_type =
            ' Update the content type with content_type_uid  - ' + JSON.parse(error.request.data).content_type.uid;
        } else if (JSON.parse(error.request.data).content_type.title) {
          message_content_type =
            ' Update the content type with content_type_title  - ' + JSON.parse(error.request.data).content_type.title;
        }
        error.errorMessage = error.errorMessage + message_content_type;
      }
      log(this.importConfig, formatError(error.errorMessage), 'error');
      log(this.importConfig, formatError(error), 'error');
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
      contentType.field_rules = this.updateFieldRules(contentType);
      if (!contentType.field_rules.length) {
        delete contentType.field_rules;
      }
      this.fieldRules.push(contentType.uid);
    }

    lookupExtension(
      this.importConfig,
      contentType.schema,
      this.importConfig.preserveStackVersion,
      this.installedExtensions,
    );
    requestObject.json.content_type = contentType;
    const contentTypeResponse = this.stackAPIClient.contentType(contentType.uid);
    Object.assign(contentTypeResponse, cloneDeep(contentType));
    await contentTypeResponse.update();
    log(this.importConfig, contentType.uid + ' updated with references', 'success');
  }

  async updateGlobalFields(uid) {
    const globalField = find(this.globalFields, { uid });
    if (globalField) {
      lookupExtension(
        this.importConfig,
        globalField.schema,
        this.importConfig.preserveStackVersion,
        this.installedExtensions,
      );
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
          log(this.importConfig, `failed to write updated the global field ${uid} ${formatError(error)}`);
        });
        log(this.importConfig, `Updated the global field ${uid} with content type references `);
        return true;
      } catch (error) {
        log(this.importConfig, `failed to update the global field ${uid} ${formatError(error)}`);
      }
    } else {
      log(this.importConfig, `Global field ${uid} does not exist, and hence failed to update.`);
    }
  }

  async mapUidToTitle() {
    this.contentTypes.forEach((ct) => {
      this.titleToUIdMap.set(ct.uid, ct.title);
    });
  }

  updateFieldRules(contentType) {
    const fieldDataTypeMap = {};
    for (let i = 0; i < contentType.schema.length; i++) {
      const field = contentType.schema[i];
      fieldDataTypeMap[field.uid] = field.data_type;
    }
    const fieldRules = [...contentType.field_rules];
    let len = fieldRules.length;
    // Looping backwards as we need to delete elements as we move.
    for (let i = len - 1; i >= 0; i--) {
      const conditions = fieldRules[i].conditions;
      let isReference = false;
      for (let j = 0; j < conditions.length; j++) {
        const field = conditions[j].operand_field;
        if (fieldDataTypeMap[field] === 'reference') {
          isReference = true;
        }
      }
      if (isReference) {
        fieldRules.splice(i, 1);
      }
    }
    return fieldRules;
  }
}

module.exports = ContentTypesImport;
