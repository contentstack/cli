/**
 * taxonomy lookup
 */
import find from 'lodash/find';
import { log } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';

/**
 * check and remove if referenced taxonomy doesn't exists in stack
 * @param {any} schema content type schema
 * @param {Record<string, unknown>} taxonomies created taxonomies
 * @param {ImportConfig} importConfig
 */
export const lookUpTaxonomy = function (importConfig: ImportConfig, schema: any, taxonomies: Record<string, unknown>) {
  log.debug(`Starting taxonomy lookup for schema with ${Object.keys(schema).length} fields`);
  
  for (let i in schema) {
    if (schema[i].data_type === 'taxonomy') {
      log.debug(`Processing taxonomy field: ${schema[i].uid}`);
      
      const taxonomyFieldData = schema[i].taxonomies as Record<string, any>[];
      const { updatedTaxonomyData, isTaxonomyFieldRemoved } = verifyAndRemoveTaxonomy(
        taxonomyFieldData,
        taxonomies,
        importConfig,
      );

      //Handle API error -> The 'taxonomies' property must have atleast one taxonomy object. Remove taxonomy field from schema.
      if (isTaxonomyFieldRemoved) {
        log.debug(`Removing taxonomy field from schema: ${schema[i].uid}`);
        schema.splice(i, 1);
      } else {
        log.debug(`Updated taxonomy field data: ${schema[i].uid}`);
        schema[i].taxonomies = updatedTaxonomyData;
      }
    }
  }
  
  log.debug('Taxonomy lookup completed');
};

/**
 * verify and remove referenced taxonomy with warning from respective content type
 * @param {Record<string, any>[]} taxonomyFieldData
 * @param {Record<string, unknown>} taxonomies created taxonomies
 * @param {ImportConfig} importConfig
 * @returns
 */
const verifyAndRemoveTaxonomy = function (
  taxonomyFieldData: Record<string, any>[],
  taxonomies: Record<string, unknown>,
  importConfig: ImportConfig,
): {
  updatedTaxonomyData: Record<string, any>[];
  isTaxonomyFieldRemoved: boolean;
} {
  log.debug(`Verifying ${taxonomyFieldData?.length || 0} taxonomy references`);
  
  let isTaxonomyFieldRemoved: boolean = false;

  for (let index = 0; index < taxonomyFieldData?.length; index++) {
    const taxonomyData = taxonomyFieldData[index];

    if (taxonomies === undefined || !taxonomies.hasOwnProperty(taxonomyData?.taxonomy_uid)) {
      // remove taxonomy from taxonomies field data with warning if respective taxonomy doesn't exists
      log.warn(`Taxonomy '${taxonomyData?.taxonomy_uid}' does not exist, removing from field`);
      taxonomyFieldData.splice(index, 1);
      --index;
    } else {
      log.debug(`Taxonomy '${taxonomyData?.taxonomy_uid}' exists and is valid`);
    }
  }

  if (!taxonomyFieldData?.length) {
    log.warn('No valid taxonomies remain, removing entire taxonomy field');
    isTaxonomyFieldRemoved = true;
  }

  log.debug(`Taxonomy verification completed, removed: ${isTaxonomyFieldRemoved}`);
  return {
    updatedTaxonomyData: taxonomyFieldData,
    isTaxonomyFieldRemoved,
  };
};

/**
 * check and remove if referenced terms doesn't exists in taxonomy
 * @param {Record<string, any>[]} ctSchema content type schema
 * @param {any} entry
 * @param {Record<string, any>} taxonomiesAndTermData created taxonomies and terms
 * @param {ImportConfig} importConfig
 */
export const lookUpTerms = function (
  ctSchema: Record<string, any>[],
  entry: any,
  taxonomiesAndTermData: Record<string, any>,
  importConfig: ImportConfig,
) {
  log.debug(`Starting term lookup for entry: ${entry.uid}`);
  
  for (let index = 0; index < ctSchema?.length; index++) {
    if (ctSchema[index].data_type === 'taxonomy') {
      log.debug(`Processing taxonomy field: ${ctSchema[index].uid}`);
      
      const taxonomyFieldData = entry[ctSchema[index].uid];
      const updatedTaxonomyData = verifyAndRemoveTerms(taxonomyFieldData, taxonomiesAndTermData, importConfig);
      
      if (updatedTaxonomyData?.length) {
        log.debug(`Updated taxonomy data for field: ${ctSchema[index].uid}`);
        entry[ctSchema[index].uid] = updatedTaxonomyData;
      } else {
        //Delete taxonomy from entry if taxonomy field removed from CT
        log.debug(`Removing taxonomy field from entry: ${ctSchema[index].uid}`);
        delete entry[ctSchema[index].uid];
      }
    }
  }
  
  log.debug('Term lookup completed');
};

/**
 * verify and remove referenced term with warning from respective entry
 * @param {Record<string, any>[]} taxonomyFieldData entry taxonomies data
 * @param {Record<string, any>} taxonomiesAndTermData created taxonomies and terms
 * @param {ImportConfig} importConfig
 * @returns { Record<string, any>[]}
 */
const verifyAndRemoveTerms = function (
  taxonomyFieldData: Record<string, any>[],
  taxonomiesAndTermData: Record<string, any>,
  importConfig: ImportConfig,
): Record<string, any>[] {
  for (let index = 0; index < taxonomyFieldData?.length; index++) {
    const taxonomyData = taxonomyFieldData[index];
    const taxUID = taxonomyData?.taxonomy_uid;
    const termUID = taxonomyData?.term_uid;
    if (
      taxonomiesAndTermData === undefined ||
      !taxonomiesAndTermData.hasOwnProperty(taxUID) ||
      (taxonomiesAndTermData.hasOwnProperty(taxUID) &&
        !find(taxonomiesAndTermData[taxUID], (term: Record<string, string>) => term?.uid === termUID))
    ) {
      // remove term from taxonomies field data with warning if respective term doesn't exists
      log.warn(`Term '${termUID}' does not exist in taxonomy '${taxUID}', removing from entry`);
      taxonomyFieldData.splice(index, 1);
      --index;
    } else {
      log.debug(`Term '${termUID}' exists in taxonomy '${taxUID}'`);
    }
  }

  return taxonomyFieldData;
};
