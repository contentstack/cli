'use strict';

class SchemaValidator {
  validate(data) {
    const { fromField, toField, toReferenceField, deriveField } = data.payload;
    // const fieldsToValidate = [payload]
    if (fromField || toField || toReferenceField || deriveField) {
      return [
        {
          ...data,
          message: `${fromField || toField || toReferenceField || deriveField} does not exist on schema.`,
        },
      ];
    }
    return [];
  }

  isApplicable(action) {
    return action.type === 'schema';
  }
}

module.exports = SchemaValidator;
