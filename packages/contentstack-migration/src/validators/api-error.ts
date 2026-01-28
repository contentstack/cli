export default class ApiError {
  validate(data: any): any[] {
    if (data.payload.apiError) {
      return [
        {
          ...data,
          message: `${data.payload.apiError.error_message}`,
        },
      ];
    }
    return [];
  }

  isApplicable(action: any): boolean {
    return action.type === 'apiError';
  }
}
