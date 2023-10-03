/**
 * taxonomy lookup
 */
import { cliux } from '@contentstack/cli-utilities';

export const lookUpTaxonomy = function (schema: any, taxonomies: Record<string, unknown>[]) {
  for (let i in schema) {
    if (schema[i].data_type === 'taxonomy') {
      const taxonomyFieldData = schema[i].taxonomies as Record<string, any>[];
      if (!taxonomyFieldData.length) break;
      for (let index = 0; index < taxonomyFieldData.length; index++) {
        const taxonomyData = taxonomyFieldData[index];
        if (taxonomies === undefined || !taxonomies[taxonomyData?.taxonomy_uid]) {
          // remove taxonomy from taxonomies field data with warning
          cliux.print(
            `Taxonomy '${taxonomyData?.taxonomy_uid}' does not exist. Removing the data from taxonomy field`,
            { color: 'yellow' },
          );
          taxonomyFieldData.splice(index, 1);
          --index;
        }
      }
      //Case 1:- if no taxonomy exist and trying to create taxonomies field API error ->  The 'taxonomies' property must have atleast one taxonomy object.
      if (!taxonomyFieldData?.length) {
        cliux.print(`Content type related Taxonomy does not exist in stack. Removing the field from schema`, {
          color: 'yellow',
        });
        schema.splice(i, 1);
      } else {
        schema[i].taxonomies = taxonomyFieldData;
      }
    }
  }
};
