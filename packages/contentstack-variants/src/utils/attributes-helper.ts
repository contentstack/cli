interface AttributeRule {
  _type: string;
  attribute?: {
    ref: string;
  };
  rules?: AttributeRule[];
}

/**
 *
 * @param attributeRules
 * @param attributesUid
 */
export const lookUpAttributes = (attributeRules: Record<string, any>[], attributesUid: Record<string, string>) => {
  for (let index =0; index< attributeRules?.length; index++) {
    const rule = attributeRules[index];

    if (rule['__type'] === 'Rule') {
      // Check if attribute reference exists in attributesUid
      const attributeRef = rule.attribute?.ref;
      const attributeType = rule.attribute['__type'];
      // check if type is UserAttributeReference
      if (attributeType === 'UserAttributeReference') {
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
