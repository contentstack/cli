export default class _TypeError {
  constructor() {}

  validate(data: any): any[] {
    if (data.payload.typeErrors) {
      return [
        {
          ...data,
          message: `${data.payload.typeErrors[0]} is not a valid function`,
        },
      ];
    }
    return [];
  }

  isApplicable(action: any): boolean {
    return action.type === 'typeError';
  }
}
