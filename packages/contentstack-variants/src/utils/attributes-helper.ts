/**
 * function to either modify the UID or eliminate it if the attribute is not created in the target project
 * @param attributeRules 
 * @param attributesUid - {attributesUid} attributes mapper data in format {<old-uid>: <new-uid>}
 * @returns 
 */
export const lookUpAttributes = (attributeRules: Record<string, any>[], attributesUid: Record<string, string>) => {
  for (let index =0; index< attributeRules?.length; index++) {
    const rule = attributeRules[index];

    if (rule['__type'] === 'Rule') {
      // Check if attribute reference exists in attributesUid
      const attributeRef = rule.attribute?.ref;
      const attributeType = rule.attribute['__type'];
      // check if type is CustomAttributeReference
      if (attributeType === 'CustomAttributeReference') {
        if (attributeRef && attributesUid.hasOwnProperty(attributeRef) && attributesUid[attributeRef]) {
          rule.attribute.ref = attributesUid[attributeRef];
        } else {
          // Remove the rule if the attribute reference is not found
          attributeRules.splice(index, 1);
          --index;
        }
      }
    } else if (rule['__type'] === 'RuleCombination' && Array.isArray(rule.rules)) {
      // Recursively look up attributes in nested rule combinations
      lookUpAttributes(rule.rules, attributesUid);
    }
  }
  return attributeRules;
};
