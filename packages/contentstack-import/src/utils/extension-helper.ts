/**
 * extension lookup
 */

/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */
import { join } from 'node:path';
import { FsUtility } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

// eslint-disable-next-line camelcase
export const lookupExtension = function (
  config: ImportConfig,
  schema: any,
  preserveStackVersion: any,
  installedExtensions: any,
) {
  const fs = new FsUtility({ basePath: config.backupDir });
  const extensionPath = join(config.backupDir, 'mapper/extensions', 'uid-mapping.json');
  const globalfieldsPath = join(config.backupDir, 'mapper/globalfields', 'uid-mapping.json');
  const marketPlaceAppsPath = join(config.backupDir, 'mapper/marketplace_apps', 'uid-mapping.json');

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
    } else if (
      schema[i].data_type === 'reference' &&
      schema[i].field_metadata.hasOwnProperty('ref_multiple_content_types') &&
      installedExtensions &&
      installedExtensions[schema[i].extension_uid]
    ) {
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    } else if (schema[i].data_type === 'text' && installedExtensions && installedExtensions[schema[i].extension_uid]) {
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    } else if (schema[i].data_type === 'global_field') {
      const global_fields_key_value = schema[i].reference_to;
      const global_fields_data = fs.readFile(globalfieldsPath) as Record<string, unknown>;
      if (global_fields_data && global_fields_data.hasOwnProperty(global_fields_key_value)) {
        schema[i].reference_to = global_fields_data[global_fields_key_value];
      }
    } else if (schema[i].hasOwnProperty('extension_uid')) {
      const extension_key_value = schema[i].extension_uid;
      const data = fs.readFile(extensionPath) as Record<string, unknown>;
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
      const data = fs.readFile(extensionPath) as Record<string, unknown>;
      const marketPlaceAppsData = fs.readFile(marketPlaceAppsPath) as { extension_uid: Record<string, unknown> };
      schema[i].plugins.forEach((extension_key_value: string) => {
        if (data && data.hasOwnProperty(extension_key_value)) {
          newPluginUidsArray.push(data[extension_key_value]);
        } else if (marketPlaceAppsData && marketPlaceAppsData.extension_uid && marketPlaceAppsData.extension_uid.hasOwnProperty(extension_key_value)) {
          newPluginUidsArray.push(marketPlaceAppsData.extension_uid[extension_key_value]);
        }
      });
      schema[i].plugins = newPluginUidsArray;
    }
  }
};
