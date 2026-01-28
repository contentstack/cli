export default class SchemaValidator {
  validate(data: any): any[] {
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

  isApplicable(action: any): boolean {
    return action.type === 'schema';
  }
}
