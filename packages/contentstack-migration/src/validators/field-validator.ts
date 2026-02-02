export default class FieldValidator {
  validate(data: any): any[] {
    if (data.payload.field) {
      return [
        {
          ...data,
          message: data.payload.field.message,
        },
      ];
    }
    return [];
  }

  isApplicable(action: any): boolean {
    return action.type === 'field';
  }
}
