/**
 * extension lookup
 */

/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import { ImportConfig } from '../types';

// eslint-disable-next-line unicorn/filename-case
let path = require('path');
const _ = require('lodash');
let helper = require('./file-helper');

// eslint-disable-next-line camelcase
export const lookupExtension = function (
  config: ImportConfig,
  schema: any,
  preserveStackVersion: any,
  installedExtensions: any,
) {
  const extensionPath = path.resolve(config.data, 'mapper/extensions', 'uid-mapping.json');
  const globalfieldsPath = path.resolve(config.data, 'mapper/globalfields', 'uid-mapping.json');
  const marketplaceAppPath = path.resolve(config.data, 'marketplace_apps', 'marketplace_apps.json');

  for (let i in schema) {
    if (schema[i].data_type === 'group') {
      lookupExtension(config, schema[i].schema, preserveStackVersion, installedExtensions);
    } else if (schema[i].data_type === 'blocks') {
      for (let block in schema[i].blocks) {
        if (schema[i].blocks[block].hasOwnProperty('reference_to')) {
          delete schema[i].blocks[block].schema;
        } else {
          lookupExtension(config, schema[i].blocks[block].schema, preserveStackVersion, installedExtensions);
        }
      }
    } else if (
      schema[i].data_type === 'reference' &&
      !schema[i].field_metadata.hasOwnProperty('ref_multiple_content_types')
    ) {
      if (preserveStackVersion) {
        // do nothing
      } else {
        schema[i].reference_to = [schema[i].reference_to];
        schema[i].field_metadata.ref_multiple_content_types = true;
      }
    } else if(
      schema[i].data_type === 'reference' &&
      schema[i].field_metadata.hasOwnProperty('ref_multiple_content_types') &&
      installedExtensions && installedExtensions[schema[i].extension_uid]
    ) {
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    } else if(
      schema[i].data_type === 'text' &&
      installedExtensions && installedExtensions[schema[i].extension_uid]
    ) {
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    }
    else if (schema[i].data_type === 'global_field') {
      let global_fields_key_value = schema[i].reference_to;
      let global_fields_data = helper.readFileSync(path.join(globalfieldsPath));
      if (global_fields_data && global_fields_data.hasOwnProperty(global_fields_key_value)) {
        schema[i].reference_to = global_fields_data[global_fields_key_value];
      }
    } else if (schema[i].hasOwnProperty('extension_uid')) {
      const extension_key_value = schema[i].extension_uid;
      const data = helper.readFileSync(path.join(extensionPath));
      if (data && data.hasOwnProperty(extension_key_value)) {
        // eslint-disable-next-line camelcase
        schema[i].extension_uid = data[extension_key_value];
      } else if (schema[i].field_metadata && schema[i].field_metadata.extension) {
        if (installedExtensions && installedExtensions[schema[i].extension_uid]) {
          schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
        }
      }
    } else if (schema[i].data_type === 'json' && schema[i].hasOwnProperty('plugins') && schema[i].plugins.length > 0) {
      const newPluginUidsArray: any[] = [];
      const data = helper.readFileSync(path.join(extensionPath));
      schema[i].plugins.forEach((extension_key_value: string) => {
        if (data && data.hasOwnProperty(extension_key_value)) {
          newPluginUidsArray.push(data[extension_key_value]);
        }
      });
      schema[i].plugins = newPluginUidsArray;
    }
  }
};
