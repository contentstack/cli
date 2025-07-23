import { log } from '@contentstack/cli-utilities';

/**
 * function to either modify the UID or eliminate it if the attribute is not created in the target project
 * @param attributeRules 
 * @param attributesUid - {attributesUid} attributes mapper data in format {<old-uid>: <new-uid>}
 * @returns 
 */
export const lookUpAttributes = (attributeRules: Record<string, any>[], attributesUid: Record<string, string>) => {
  log.debug(`Looking up attributes in ${attributeRules?.length || 0} rules`);
  log.debug(`Available attribute mappings: ${Object.keys(attributesUid).length}`);
  
  for (let index = 0; index < attributeRules?.length; index++) {
    const rule = attributeRules[index];
    log.debug(`Processing rule ${index + 1}/${attributeRules.length} of type: ${rule['__type']}`);

    if (rule['__type'] === 'Rule') {
      // Check if attribute reference exists in attributesUid
      const attributeRef = rule.attribute?.ref;
      const attributeType = rule.attribute['__type'];
      
      log.debug(`Rule attribute type: ${attributeType}, reference: ${attributeRef}`);
      
      // check if type is CustomAttributeReference
      if (attributeType === 'CustomAttributeReference') {
        if (attributeRef && attributesUid.hasOwnProperty(attributeRef) && attributesUid[attributeRef]) {
          const newAttributeRef = attributesUid[attributeRef];
          log.debug(`Mapping attribute reference: ${attributeRef} -> ${newAttributeRef}`);
          rule.attribute.ref = newAttributeRef;
        } else {
          log.warn(`Attribute reference not found in mapping: ${attributeRef}. Removing rule.`);
          // Remove the rule if the attribute reference is not found
          attributeRules.splice(index, 1);
          --index;
        }
      } else {
        log.debug(`Skipping non-custom attribute reference: ${attributeType}`);
      }
    } else if (rule['__type'] === 'RuleCombination' && Array.isArray(rule.rules)) {
      log.debug(`Processing nested rule combination with ${rule.rules.length} sub-rules`);
      // Recursively look up attributes in nested rule combinations
      lookUpAttributes(rule.rules, attributesUid);
    } else {
      log.debug(`Skipping rule of type: ${rule['__type']}`);
    }
  }
  
  log.debug(`Attribute lookup completed. Final rule count: ${attributeRules.length}`);
  return attributeRules;
};
