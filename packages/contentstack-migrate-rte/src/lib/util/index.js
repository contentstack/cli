const { Command } = require('@contentstack/cli-command');
const command = new Command();
const chalk = require('chalk');
const {
  isEmpty,
  find,
  get,
  isArray,
  isUndefined,
  set,
  flatten,
  cloneDeep,
  isNil,
  isNull,
  isPlainObject,
} = require('lodash');
const Validator = require('jsonschema').Validator;
const configSchema = require('./config_schema.json');
const { JSDOM } = require('jsdom');
const collapseWithSpace = require('collapse-whitespace');
const { htmlToJson } = require('@contentstack/json-rte-serializer');
const nodePath = require('path');
const {
  cliux,
  managementSDKClient,
  isAuthenticated,
  doesBranchExist,
  pathValidator,
} = require('@contentstack/cli-utilities');
const packageValue = require('../../../package.json');
const isBlank = (variable) => {
  return isNil(variable) || isEmpty(variable);
};

async function getStack(data) {
  const stackOptions = {};
  const options = {
    host: data.host,
    application: `json-rte-migration/${packageValue.version}`,
    timeout: 120000,
  };
  if (data.token) {
    const tokenDetails = data.token;
    stackOptions['api_key'] = tokenDetails.apiKey;
    options['management_token'] = tokenDetails.token; // need to pass management token so that the sdk doesn't get configured with authtoken (throws error in case of oauth, if the provided stack doesn't belong to the org selected while logging in with oauth)
    stackOptions['management_token'] = tokenDetails.token;
  }
  if (data.stackApiKey) {
    if (!isAuthenticated()) {
      throw new Error(
        'Please login to proceed further. Or use `--alias` instead of `--stack-api-key` to proceed without logging in.',
      );
    }
    stackOptions['api_key'] = data.stackApiKey;
  }
  if (data.branch) options.branchName = data.branch;
  const client = await managementSDKClient(options);
  const stack = client.stack(stackOptions);

  stack.host = data.host;
  if (data.branch) {
    let branchData = await doesBranchExist(stack, data.branch);
    if (branchData && branchData.errorCode) {
      throw new Error(branchData.errorMessage);
    }
  }
  return stack;
}

const deprecatedFields = {
  configPath: 'config-path',
  content_type: 'content-type',
  isGlobalField: 'global-field',
  htmlPath: 'html-path',
  jsonPath: 'json-path',
};
function normalizeFlags(config) {
  let normalizedConfig = cloneDeep(config);
  Object.keys(deprecatedFields).forEach((key) => {
    if (normalizedConfig.hasOwnProperty(key)) {
      normalizedConfig[deprecatedFields[key]] = normalizedConfig[key];
      delete normalizedConfig[key];
    }
  });
  return normalizedConfig;
}

const customBar = cliux.progress({
  format: '{title} ' + '| {bar} | {value}/{total} Entries',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  stream: process.stdout,
});
async function getConfig(flags) {
  try {
    let config;
    if (flags['config-path']) {
      const configPath = flags['config-path'];
      config = require(pathValidator(configPath));
    } else {
      config = {
        'content-type': flags['content-type'],
        'global-field': flags['global-field'],
        paths: [
          {
            from: flags['html-path'] || flags.htmlPath,
            to: flags['json-path'] || flags.jsonPath,
          },
        ],
        delay: flags.delay,
        'batch-limit': flags['batch-limit'],
      };
      if (flags.locale) {
        config.locale = [flags.locale];
      }
      if (flags.branch) {
        config.branch = flags['branch'];
      }
      if (flags.alias) {
        config.alias = flags.alias;
      }
      if (flags['stack-api-key']) {
        config['stack-api-key'] = flags['stack-api-key'];
      }
    }
    if (checkConfig(config)) {
      let confirmed = await confirmConfig(config, flags.yes);
      if (confirmed) {
        return config;
      }
      throw new Error('User aborted the command.');
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'MODULE_NOT_FOUND') {
      throw new Error('The specified path to config file does not exist.');
    }
    if (error.schema && error.errors && error.errors[0]) {
      throwConfigError(error.errors[0]);
    }
    throw error;
  }
}
function getToken(alias) {
  try {
    return command.getToken(alias);
  } catch (error) {
    throw new Error('Invalid alias provided for the management token.');
  }
}
function getContentType(stack, contentTypeUid) {
  return stack
    .contentType(contentTypeUid)
    .fetch({ include_global_field_schema: true })
    .then((content) => content)
    .catch((error) => {
      throw new Error(error.errorMessage || error.message);
    });
}
function getGlobalField(stack, globalFieldUid) {
  return stack
    .globalField(globalFieldUid)
    .fetch({ include_content_types: true })
    .then((content) => content)
    .catch((error) => {
      throw new Error(error.errorMessage || error.message);
    });
}
function throwConfigError(error) {
  const { name, path, argument } = error;
  let fieldName = path.join('.');
  if (fieldName === '') {
    fieldName = argument || 'Config';
  }
  if (name === 'required') {
    throw new Error(`${fieldName} is mandatory while defining config.`);
  } else if (name === 'type') {
    throw new Error(`Invalid key type. ${fieldName} must be of ${argument[0] || 'string'} type(s).`);
  } else if (name === 'minimum' || name === 'maximum') {
    throw new Error(`${fieldName} must be between 1 and 100.`);
  }
}
function checkConfig(config) {
  let v = new Validator();
  let res = v.validate(config, configSchema, { throwError: true, nestedErrors: true });
  return res.valid;
}
function prettyPrint(data) {
  console.log(chalk.yellow('Configuration to be used for executing this command:'));
  console.log(chalk.grey(JSON.stringify(data, null, 2)));
  console.log('\n');
}
async function confirmConfig(config, skipConfirmation) {
  if (skipConfirmation) {
    return Promise.resolve(true);
  }
  prettyPrint(config);
  return cliux.confirm('Do you want to continue with this configuration ? [yes or no]');
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function updateEntriesInBatch(contentType, config, skip = 0, retry = 0, locale = undefined) {
  let title = `Migrating entries for ${contentType.uid}`;
  let extraParams = {};
  if (locale) {
    extraParams.locale = locale;
    extraParams.query = { locale: locale };
  }
  if (config['failed-entries'] && config['failed-entries'].length > 0) {
    title = `Migrating failed entries for ${contentType.uid}`;
    if (extraParams.query) {
      extraParams.query['uid'] = { $in: config['failed-entries'] };
    } else {
      extraParams = { query: { uid: { $in: config['failed-entries'] } } };
    }
  }
  let entryQuery = {
    include_count: true,
    ...extraParams,
    skip: skip,
    limit: config['batch-limit'] || 50,
  };
  try {
    await contentType
      .entry()
      .query(entryQuery)
      .find()
      .then(async (entriesResponse) => {
        try {
          customBar.start(entriesResponse.count, skip, {
            title: title,
          });
        } catch (error) {}
        skip += entriesResponse.items.length;
        let entries = entriesResponse.items;

        for (const entry of entries) {
          try {
            customBar.increment();
          } catch (error) {}
          await updateSingleEntry(entry, contentType, config);
          await delay(config.delay || 1000);
        }
        if (skip === entriesResponse.count) {
          return Promise.resolve();
        }
        await updateEntriesInBatch(contentType, config, skip, 0, locale);
      });
  } catch (error) {
    console.error(`Error while fetching batch of entries: ${error.message}`);
    if (retry < 3) {
      retry += 1;
      console.error(`Retrying again in 5 seconds... (${retry}/3)`);
      await delay(5000);
      await updateEntriesInBatch(contentType, config, skip, retry, locale);
    } else {
      throw new Error(`Max retry exceeded: Error while fetching batch of entries: ${error.message}`);
    }
  }
}
async function updateSingleContentTypeEntries(stack, contentTypeUid, config) {
  let contentType = await getContentType(stack, contentTypeUid);
  let schema = contentType.schema;
  for (const path of config.paths) {
    if (!isEmpty(schema)) {
      isPathValid(contentType.schema, path);
    } else {
      throw new Error(`The ${contentTypeUid} content type contains an empty schema.`);
    }
  }
  if (config.locale && isArray(config.locale) && config.locale.length > 0) {
    const locales = config.locale;
    for (const locale of locales) {
      console.log(`\nMigrating entries for "${contentTypeUid}" Content-type in "${locale}" locale`);
      await updateEntriesInBatch(contentType, config, 0, 0, locale);
      await delay(config.delay || 1000);
    }
  } else {
    await updateEntriesInBatch(contentType, config);
  }
  config.contentTypeCount += 1;
  try {
    customBar.stop();
  } catch (error) {}
}
async function updateSingleContentTypeEntriesWithGlobalField(contentType, config) {
  let schema = contentType.schema;
  for (const path of config.paths) {
    isPathValid(schema, path);
  }
  if (config.locale && isArray(config.locale) && config.locale.length > 0) {
    const locales = config.locale;
    for (const locale of locales) {
      console.log(`\nMigrating entries for ${contentType.uid} in locale ${locale}`);
      await updateEntriesInBatch(contentType, config, 0, 0, locale);
      await delay(config.delay || 1000);
    }
  } else {
    await updateEntriesInBatch(contentType, config);
  }
  config.contentTypeCount += 1;
}
async function updateSingleEntry(entry, contentType, config) {
  let schema = contentType.schema;
  let paths = config.paths;
  let entryUploadPath = uploadPaths(schema);
  entryUploadPath = Object.keys(entryUploadPath);
  for (const path of paths) {
    let htmlPath = path.from.split('.');
    let jsonPath = path.to.split('.');
    let htmlRteUid = htmlPath[htmlPath.length - 1];
    let jsonRteUid = jsonPath[jsonPath.length - 1];
    let parentPath = htmlPath.slice(0, htmlPath.length - 1).join('.');
    setEntryData(parentPath, entry, schema, { htmlRteUid, jsonRteUid });
  }
  try {
    for (const filePath of entryUploadPath) {
      let fileFieldPath = filePath.split('.');
      let fileUid = fileFieldPath[fileFieldPath.length - 1];
      let parentFileFieldPath = fileFieldPath.slice(0, fileFieldPath.length - 1).join('.');
      unsetResolvedUploadData(parentFileFieldPath, entry, schema, { fileUid });
    }
  } catch (error) {
    console.error(`Error while unsetting resolved upload data: ${error.message}`);
  }
  await handleEntryUpdate(entry, config, 0);
}
async function handleEntryUpdate(entry, config, retry = 0) {
  try {
    await entry.update({ locale: entry.locale });
    config.entriesCount += 1;
  } catch (error) {
    console.log(chalk.red(`Error while updating '${entry.uid}' entry`));
    if (error.errors && isPlainObject(error.errors)) {
      const errVal = Object.entries(error.errors);
      errVal.forEach(([key, vals]) => {
        console.log(chalk.red(` ${key}:-  ${vals.join(',')}`));
      });
    } else {
      console.log(chalk.red(`Error stack: ${error}`));
    }
    if (retry < 3) {
      retry += 1;
      console.log(`Retrying again in 5 seconds... (${retry}/3)`);
      await delay(5000);
      await handleEntryUpdate(entry, config, retry);
    } else {
      if (
        config &&
        config.errorEntriesUid &&
        config.errorEntriesUid[entry.content_type_uid] &&
        config.errorEntriesUid[entry.content_type_uid][entry.locale]
      ) {
        config.errorEntriesUid[entry.content_type_uid][entry.locale].push(entry.uid);
      } else {
        set(config, ['errorEntriesUid', entry.content_type_uid, entry.locale], [entry.uid]);
      }
    }
  }
}
function traverseSchemaForField(schema, path, field_uid) {
  let paths = path.split('.');
  if (paths.length === 1) {
    let field = find(schema, (o) => {
      return o.uid === paths[0];
    });
    if (Boolean(field) && field.uid === field_uid) {
      return field;
    }
  } else {
    let fieldUid = paths.shift();
    let fieldSchema = find(schema, { uid: fieldUid });
    if (!isEmpty(fieldSchema)) {
      if (fieldSchema.data_type === 'group' || fieldSchema.data_type === 'global_field') {
        return traverseSchemaForField(fieldSchema.schema, paths.join('.'), field_uid);
      }
      if (fieldSchema.data_type === 'blocks') {
        let blockUid = paths.shift();
        let block = find(fieldSchema.blocks, { uid: blockUid });
        if (!isEmpty(block) && block.schema) {
          return traverseSchemaForField(block.schema, paths.join('.'), field_uid);
        }
      }
    }
  }
  return {};
}
function isPathValid(schema, path) {
  let pathFrom = path.from.split('.');
  let htmlParentPath = pathFrom.slice(0, pathFrom.length - 1).join('.');
  const rteUid = pathFrom[pathFrom.length - 1];
  let rteSchema = traverseSchemaForField(schema, path.from, rteUid);
  if (isEmpty(rteSchema)) {
    throw new Error(`The specified path to ${rteUid} HTML RTE does not exist.`);
  }
  let ishtmlRteMultiple = rteSchema.multiple || false;
  if (rteSchema.field_metadata && rteSchema.field_metadata.allow_rich_text) {
    let pathTo = path.to.split('.');
    let jsonParentPath = pathTo.slice(0, pathTo.length - 1).join('.');

    const jsonUid = pathTo[pathTo.length - 1];
    let jsonSchema = traverseSchemaForField(schema, path.to, jsonUid);
    if (isEmpty(jsonSchema)) {
      throw new Error(`The specified path to ${jsonUid} JSON RTE does not exist.`);
    }
    let isJSONRteMultiple = jsonSchema.multiple || false;

    if (jsonSchema.field_metadata && jsonSchema.field_metadata.allow_json_rte) {
      if (htmlParentPath === jsonParentPath) {
        if (ishtmlRteMultiple === isJSONRteMultiple) {
          return true;
        }
        throw new Error(
          `Cannot convert "${ishtmlRteMultiple ? 'Multiple' : 'Single'}" type HTML RTE to "${
            isJSONRteMultiple ? 'Multiple' : 'Single'
          }" type JSON RTE.`,
        );
      } else {
        throw new Error(
          'To complete migration, HTML RTE and JSON RTE should be present at the same field depth level.',
        );
      }
    } else {
      throw new Error(`The specified path to ${jsonUid} JSON RTE does not exist.`);
    }
  } else {
    throw new Error(`The specified path to ${rteUid} HTML RTE does not exist.`);
  }
}
function setEntryData(path, entry, schema, fieldMetaData) {
  let paths = path.split('.');
  if (paths.length === 1 && paths[0] === '') {
    paths.shift();
  }
  if (paths.length > 0) {
    let field = find(schema, {
      uid: paths[0],
    });
    if (field) {
      if (field.data_type === 'group' || field.data_type === 'global_field') {
        paths.shift();

        let sub_entry_data = get(entry, field.uid);
        if (isArray(sub_entry_data)) {
          for (const sub_data of sub_entry_data) {
            setEntryData(paths.join('.'), sub_data, field.schema, fieldMetaData);
          }
        } else {
          setEntryData(paths.join('.'), sub_entry_data, field.schema, fieldMetaData);
        }
      } else if (field.data_type === 'blocks') {
        if (field.blocks) {
          let ModularBlockUid = paths.shift();
          let blockUid = paths.shift();
          let blockField = find(field.blocks, { uid: blockUid });
          if (blockField) {
            let modularBlockDetails = get(entry, ModularBlockUid) || [];
            for (const blocks of modularBlockDetails) {
              let blockdata = get(blocks, blockUid);
              if (blockdata) {
                setEntryData(paths.join('.'), blockdata, blockField.schema, fieldMetaData);
              }
            }
          }
        }
      }
    }
  } else if (paths.length === 0) {
    if (entry) {
      const { htmlRteUid, jsonRteUid } = fieldMetaData;
      const htmlValue = get(entry, htmlRteUid);
      // check if html field exist in traversed path
      if (!isUndefined(htmlValue)) {
        // if Rte field is multiple
        if (isArray(htmlValue)) {
          for (let i = 0; i < htmlValue.length; i++) {
            let html = htmlValue[i];
            setJsonValue(html, entry, `${jsonRteUid}.${i}`);
          }
        } else {
          setJsonValue(htmlValue, entry, jsonRteUid);
        }
      }
    }
  }
}

function unsetResolvedUploadData(path, entry, schema, fieldMetaData) {
  let paths = path.split('.');
  if (paths.length === 1 && paths[0] === '') {
    paths.shift();
  }
  if (paths.length > 0) {
    let field = find(schema, {
      uid: paths[0],
    });
    if (field) {
      if (field.data_type === 'group' || field.data_type === 'global_field') {
        paths.shift();

        let sub_entry_data = get(entry, field.uid);
        if (isArray(sub_entry_data)) {
          for (const sub_data of sub_entry_data) {
            unsetResolvedUploadData(paths.join('.'), sub_data, field.schema, fieldMetaData);
          }
        } else {
          unsetResolvedUploadData(paths.join('.'), sub_entry_data, field.schema, fieldMetaData);
        }
      } else if (field.data_type === 'blocks') {
        if (field.blocks) {
          let ModularBlockUid = paths.shift();
          let blockUid = paths.shift();
          let blockField = find(field.blocks, { uid: blockUid });
          if (blockField) {
            let modularBlockDetails = get(entry, ModularBlockUid) || [];
            for (const blocks of modularBlockDetails) {
              let blockdata = get(blocks, blockUid);
              if (blockdata) {
                unsetResolvedUploadData(paths.join('.'), blockdata, blockField.schema, fieldMetaData);
              }
            }
          }
        }
      }
    }
  } else if (paths.length === 0) {
    if (entry) {
      const { fileUid } = fieldMetaData;
      const fieldValue = get(entry, fileUid);
      if (!isUndefined(fieldValue) && !isNull(fieldValue)) {
        if (isArray(fieldValue)) {
          for (let i = 0; i < fieldValue.length; i++) {
            const singleFile = fieldValue[i];
            if (!isUndefined(singleFile.uid)) {
              set(entry, `${fileUid}.${i}`, singleFile.uid);
            }
          }
        } else if (!isUndefined(fieldValue.uid)) {
          set(entry, fileUid, fieldValue.uid);
        }
      }
    }
  }
}
function setJsonValue(html, entry, path) {
  let doc = convertHtmlToJson(html);
  set(entry, path, doc);
}
function convertHtmlToJson(html) {
  const dom = new JSDOM(html);
  let htmlDoc = dom.window.document.querySelector('body');
  collapseWithSpace(htmlDoc);
  let doc;
  try {
    doc = htmlToJson(htmlDoc);
    applyDirtyAttributesToBlock(doc);
  } catch (error) {
    throw new Error('Error while converting html '.concat(error.message));
  }
  return doc;
}
function applyDirtyAttributesToBlock(block) {
  if (block.hasOwnProperty('text')) {
    return block;
  }
  let children = flatten([...(block.children || [])].map(applyDirtyAttributesToBlock));
  if (block.hasOwnProperty('type')) {
    set(block, 'attrs.dirty', true);
  }
  block.children = children;
  return block;
}
async function updateContentTypeForGlobalField(stack, global_field, config) {
  const globalField = await getGlobalField(stack, global_field);
  if (isEmpty(globalField.schema)) {
    throw new Error(`The ${global_field} Global field contains an empty schema.`);
  }
  let allReferredContentTypes = globalField.referred_content_types;
  if (!isEmpty(allReferredContentTypes)) {
    for (const contentType of allReferredContentTypes) {
      let contentTypeInstance = await getContentType(stack, contentType.uid);
      const schema = contentTypeInstance.schema;
      if (!isEmpty(schema) && !isUndefined(schema)) {
        let globalFieldPaths = getGlobalFieldPath(contentTypeInstance.schema, global_field);
        let newConfig = cloneDeep(config);
        updateMigrationPath(globalFieldPaths, newConfig);
        await updateSingleContentTypeEntriesWithGlobalField(contentTypeInstance, newConfig);
        config.contentTypeCount = newConfig.contentTypeCount;
        config.entriesCount = newConfig.entriesCount;
        config.errorEntriesUid = newConfig.errorEntriesUid;
      } else {
        throw new Error(`The ${contentType.uid} content type referred in ${globalField.uid} contains an empty schema.`);
      }
    }
    try {
      customBar.stop();
    } catch (error) {}
  } else {
    throw new Error(`${globalField.uid} Global field is not referred in any content type.`);
  }
}
function updateMigrationPath(globalFieldPaths, config) {
  const newPath = [];
  for (const path of config.paths) {
    for (const globalFieldPath of globalFieldPaths) {
      newPath.push({ from: globalFieldPath + '.' + path.from, to: globalFieldPath + '.' + path.to });
    }
  }
  config.paths = newPath;
}
function getGlobalFieldPath(schema, globalFieldUid) {
  let paths = [];

  function genPath(prefix, path) {
    return isEmpty(prefix) ? path : [prefix, path].join('.');
  }

  function traverse(fields, path) {
    path = path || '';
    for (const field of fields) {
      let currPath = genPath(path, field.uid);
      if (field.data_type === 'group') {
        traverse(field.schema, currPath);
      }

      if (
        field.data_type === 'global_field' &&
        isUndefined(field.schema) === false &&
        isEmpty(field.schema) === false
      ) {
        if (field.reference_to === globalFieldUid) {
          paths.push(currPath);
        }
      }
      if (field.data_type === 'blocks') {
        field.blocks.forEach(function (block) {
          if (block.schema) {
            if (block.reference_to && block.reference_to === globalFieldUid) {
              paths.push(currPath + '.' + block.uid);
            }
            traverse(block.schema, currPath + '.' + block.uid);
          }
        });
      }
      // experience_container
      if (field.data_type === 'experience_container') {
        if (field.variations) {
          field.variations.forEach(function (variation) {
            if (variation.schema) traverse(variation.schema, currPath + '.' + variation.uid);
          });
        }
      }
    }
  }

  if (!isEmpty(schema)) {
    traverse(schema, '');
  }

  return paths;
}

/*
 Get the upload paths
 */
function uploadPaths(schema) {
  return getPaths(schema, 'file');
}

/*
Generic function to get schema paths
*/
function getPaths(schema, type) {
  const paths = {};

  function genPath(prefix, path) {
    return isBlank(prefix) ? path : [prefix, path].join('.');
  }

  function traverse(fields, path) {
    path = path || '';
    for (const element of fields) {
      const field = element;
      const currPath = genPath(path, field.uid);

      if (field.data_type === type) paths[currPath] = true;

      if (field.data_type === 'group') traverse(field.schema, currPath);

      if (field.data_type === 'global_field' && isUndefined(field.schema) === false && isEmpty(field.schema) === false)
        traverse(field.schema, currPath);
      if (field.data_type === 'blocks') {
        field.blocks.forEach(function (block) {
          if (block.schema) traverse(block.schema, currPath + '.' + block.uid);
        });
      }
      // experience_container
      if (field.data_type === 'experience_container') {
        field.variations.forEach(function (variation) {
          if (variation.schema) traverse(variation.schema, currPath + '.' + variation.uid);
        });
      }
    }
  }

  traverse(schema);

  return paths;
}

module.exports = {
  getStack,
  getConfig,
  getToken,
  getContentType,
  updateEntriesInBatch,
  updateSingleContentTypeEntries,
  updateContentTypeForGlobalField,
  command,
  normalizeFlags,
};
