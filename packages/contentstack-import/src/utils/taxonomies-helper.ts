/**
 * taxonomy lookup
 */
import { cliux } from '@contentstack/cli-utilities';

/**
 * check and remove if referenced taxonomy doesn't exists in stack
 * @param {any} schema content type schema
 * @param {Record<string, unknown>} taxonomies created taxonomies
 */
export const lookUpTaxonomy = function (schema: any, taxonomies: Record<string, unknown>) {
  for (let i in schema) {
    if (schema[i].data_type === 'taxonomy') {
      const taxonomyFieldData = schema[i].taxonomies as Record<string, any>[];
      const { updatedTaxonomyData, isTaxonomyFieldRemoved } = verifyAndRemoveTaxonomy(taxonomyFieldData, taxonomies);

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
 * @returns
 */
const verifyAndRemoveTaxonomy = function (
  taxonomyFieldData: Record<string, any>[],
  taxonomies: Record<string, unknown>,
): {
  updatedTaxonomyData: Record<string, any>[];
  isTaxonomyFieldRemoved: boolean;
} {
  let isTaxonomyFieldRemoved: boolean = false;

  for (let index = 0; index < taxonomyFieldData?.length; index++) {
    const taxonomyData = taxonomyFieldData[index];

    if (taxonomies === undefined || !taxonomies.hasOwnProperty(taxonomyData?.taxonomy_uid)) {
      // remove taxonomy from taxonomies field data with warning if respective taxonomy doesn't exists
      cliux.print(`Taxonomy '${taxonomyData?.taxonomy_uid}' does not exist. Removing the data from the taxonomies field`, {
        color: 'yellow',
      });
      taxonomyFieldData.splice(index, 1);
      --index;
    }
  }

  if (!taxonomyFieldData?.length) {
    cliux.print('Taxonomy does not exist. Removing the field from content type', { color: 'yellow' });
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
 */
export const lookUpTerms = function (
  ctSchema: Record<string, any>[],
  entry: any,
  taxonomiesAndTermData: Record<string, any>,
) {
  for (let index = 0; index < ctSchema?.length; index++) {
    if (ctSchema[index].data_type === 'taxonomy') {
      const taxonomyFieldData = entry[ctSchema[index].uid];
      const updatedTaxonomyData = verifyAndRemoveTerms(taxonomyFieldData, taxonomiesAndTermData);
      entry[ctSchema[index].uid] = updatedTaxonomyData;
    }
  }
};

/**
 * verify and remove referenced term with warning from respective entry
 * @param {Record<string, any>[]} taxonomyFieldData entry taxonomies data
 * @param {Record<string, any>} taxonomiesAndTermData created taxonomies and terms
 * @returns { Record<string, any>[]}
 */
const verifyAndRemoveTerms = function (
  taxonomyFieldData: Record<string, any>[],
  taxonomiesAndTermData: Record<string, any>,
): Record<string, any>[] {
  for (let index = 0; index < taxonomyFieldData?.length; index++) {
    const taxonomyData = taxonomyFieldData[index];
    const taxUID = taxonomyData?.taxonomy_uid;
    const termUID = taxonomyData?.term_uid;

    if (
      taxonomiesAndTermData === undefined ||
      !taxonomiesAndTermData.hasOwnProperty(taxUID) ||
      (taxonomiesAndTermData.hasOwnProperty(taxUID) && !taxonomiesAndTermData[taxUID].hasOwnProperty(termUID))
    ) {
      // remove term from taxonomies field data with warning if respective term doesn't exists
      cliux.print(`Term '${termUID}' does not exist. Removing it from taxonomy - '${taxUID}'`, { color: 'yellow' });
      taxonomyFieldData.splice(index, 1);
      --index;
    }
  }

  return taxonomyFieldData;
};
