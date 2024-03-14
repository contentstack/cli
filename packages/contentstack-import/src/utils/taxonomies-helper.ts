/**
 * taxonomy lookup
 */
import find from 'lodash/find';
import { log } from './';
import { ImportConfig } from '../types';

/**
 * check and remove if referenced taxonomy doesn't exists in stack
 * @param {any} schema content type schema
 * @param {Record<string, unknown>} taxonomies created taxonomies
 * @param {ImportConfig} importConfig
 */
export const lookUpTaxonomy = function (importConfig: ImportConfig, schema: any, taxonomies: Record<string, unknown>) {
  for (let i in schema) {
    if (schema[i].data_type === 'taxonomy') {
      const taxonomyFieldData = schema[i].taxonomies as Record<string, any>[];
      const { updatedTaxonomyData, isTaxonomyFieldRemoved } = verifyAndRemoveTaxonomy(
        taxonomyFieldData,
        taxonomies,
        importConfig,
      );

      //Handle API error -> The 'taxonomies' property must have atleast one taxonomy object. Remove taxonomy field from schema.
      if (isTaxonomyFieldRemoved) {
        schema.splice(i, 1);
      } else {
        schema[i].taxonomies = updatedTaxonomyData;
      }
    }
  }
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
  let isTaxonomyFieldRemoved: boolean = false;

  for (let index = 0; index < taxonomyFieldData?.length; index++) {
    const taxonomyData = taxonomyFieldData[index];

    if (taxonomies === undefined || !taxonomies.hasOwnProperty(taxonomyData?.taxonomy_uid)) {
      // remove taxonomy from taxonomies field data with warning if respective taxonomy doesn't exists
      log(
        importConfig,
        `Taxonomy '${taxonomyData?.taxonomy_uid}' does not exist. Removing the data from the taxonomies field`,
        'warn',
      );
      taxonomyFieldData.splice(index, 1);
      --index;
    }
  }

  if (!taxonomyFieldData?.length) {
    log(importConfig, 'Taxonomy does not exist. Removing the field from content type', 'warn');
    isTaxonomyFieldRemoved = true;
  }

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
  for (let index = 0; index < ctSchema?.length; index++) {
    if (ctSchema[index].data_type === 'taxonomy') {
      const taxonomyFieldData = entry[ctSchema[index].uid];
      const updatedTaxonomyData = verifyAndRemoveTerms(taxonomyFieldData, taxonomiesAndTermData, importConfig);
      if (updatedTaxonomyData?.length) {
        entry[ctSchema[index].uid] = updatedTaxonomyData;
      } else {
        //Delete taxonomy from entry if taxonomy field removed from CT
        delete entry[ctSchema[index].uid];
      }
    }
  }
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
      log(importConfig, `Term '${termUID}' does not exist. Removing it from taxonomy - '${taxUID}'`, 'warn');
      taxonomyFieldData.splice(index, 1);
      --index;
    }
  }

  return taxonomyFieldData;
};
