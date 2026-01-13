/**
 * extension lookup
 */

/*!
 * Contentstack Import
 * Copyright (c) 2026 Contentstack LLC
 * MIT Licensed
 */
import { join } from 'node:path';
import { FsUtility, log } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

// eslint-disable-next-line camelcase
export const lookupExtension = function (
  config: ImportConfig,
  schema: any,
  preserveStackVersion: any,
  installedExtensions: any,
) {
  log.debug('Starting extension lookup process...');

  const fs = new FsUtility({ basePath: config.backupDir });
  const extensionPath = join(config.backupDir, 'mapper/extensions', 'uid-mapping.json');
  const globalfieldsPath = join(config.backupDir, 'mapper/globalfields', 'uid-mapping.json');
  const marketPlaceAppsPath = join(config.backupDir, 'mapper/marketplace_apps', 'uid-mapping.json');

  log.debug(
    `Extension mapping paths - Extensions: ${extensionPath}, Global fields: ${globalfieldsPath}, Marketplace apps: ${marketPlaceAppsPath}`,
  );

  for (let i in schema) {
    if (schema[i].data_type === 'group') {
      log.debug(`Processing group field: ${schema[i].uid}`);
      lookupExtension(config, schema[i].schema, preserveStackVersion, installedExtensions);
    } else if (schema[i].data_type === 'blocks') {
      log.debug(`Processing blocks field: ${schema[i].uid}`);
      for (let block in schema[i].blocks) {
        if (schema[i].blocks[block].hasOwnProperty('reference_to')) {
          log.debug(`Removing schema from block with reference_to: ${schema[i].blocks[block].uid}`);
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
        log.debug(`Preserving stack version for reference field: ${schema[i].uid}`);
        // do nothing
      } else {
        log.debug(`Converting reference field to multi-reference format: ${schema[i].uid}`);
        schema[i].reference_to = [schema[i].reference_to];
        schema[i].field_metadata.ref_multiple_content_types = true;
      }
    } else if (
      schema[i].data_type === 'reference' &&
      schema[i].field_metadata.hasOwnProperty('ref_multiple_content_types') &&
      installedExtensions &&
      installedExtensions[schema[i].extension_uid]
    ) {
      log.debug(`Updating extension UID for reference field: ${schema[i].uid}`);
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    } else if (schema[i].data_type === 'text' && installedExtensions && installedExtensions[schema[i].extension_uid]) {
      log.debug(`Updating extension UID for text field: ${schema[i].uid}`);
      schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
    } else if (schema[i].data_type === 'global_field') {
      log.debug(`Processing global field: ${schema[i].uid}`);
      const global_fields_key_value = schema[i].reference_to;
      const global_fields_data = fs.readFile(globalfieldsPath) as Record<string, unknown>;

      if (global_fields_data && global_fields_data.hasOwnProperty(global_fields_key_value)) {
        const mappedValue = global_fields_data[global_fields_key_value];
        log.debug(`Mapping global field reference: ${global_fields_key_value} -> ${mappedValue}`);
        schema[i].reference_to = global_fields_data[global_fields_key_value];
      } else {
        log.debug(`No mapping found for global field: ${global_fields_key_value}`);
      }
    } else if (schema[i].hasOwnProperty('extension_uid')) {
      log.debug(`Processing field with extension UID: ${schema[i].uid}`);
      const extension_key_value = schema[i].extension_uid;
      const data = fs.readFile(extensionPath) as Record<string, unknown>;

      if (data && data.hasOwnProperty(extension_key_value)) {
        const mappedExtension = data[extension_key_value];
        log.debug(`Mapping extension UID: ${extension_key_value} -> ${mappedExtension}`);
        // eslint-disable-next-line camelcase
        schema[i].extension_uid = data[extension_key_value];
      } else if (schema[i].field_metadata && schema[i].field_metadata.extension) {
        if (installedExtensions && installedExtensions[schema[i].extension_uid]) {
          log.debug(`Using installed extension mapping: ${schema[i].extension_uid}`);
          schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
        } else {
          log.debug(`No mapping found for extension: ${extension_key_value}`);
        }
      }
    } else if (schema[i].data_type === 'json' && schema[i].hasOwnProperty('plugins') && schema[i].plugins.length > 0) {
      log.debug(`Processing JSON field with plugins: ${schema[i].uid}`);
      const newPluginUidsArray: any[] = [];
      const data = fs.readFile(extensionPath) as Record<string, unknown>;
      const marketPlaceAppsData = fs.readFile(marketPlaceAppsPath) as { extension_uid: Record<string, unknown> };

      schema[i].plugins.forEach((extension_key_value: string) => {
        if (data && data.hasOwnProperty(extension_key_value)) {
          const mappedPlugin = data[extension_key_value];
          log.debug(`Mapping plugin extension: ${extension_key_value} -> ${mappedPlugin}`);
          newPluginUidsArray.push(data[extension_key_value]);
        } else if (
          marketPlaceAppsData &&
          marketPlaceAppsData.extension_uid &&
          marketPlaceAppsData.extension_uid.hasOwnProperty(extension_key_value)
        ) {
          const mappedMarketplaceExt = marketPlaceAppsData.extension_uid[extension_key_value];
          log.debug(`Mapping marketplace app extension: ${extension_key_value} -> ${mappedMarketplaceExt}`);
          newPluginUidsArray.push(marketPlaceAppsData.extension_uid[extension_key_value]);
        } else {
          log.debug(`No mapping found for plugin extension: ${extension_key_value}`);
        }
      });

      log.debug(`Updated plugins array with ${newPluginUidsArray.length} mapped extensions`);
      schema[i].plugins = newPluginUidsArray;
    }
  }

  log.debug('Extension lookup process completed');
};
