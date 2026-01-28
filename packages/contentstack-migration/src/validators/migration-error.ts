export default class MigrationError {
  validate(data: any): any[] | undefined {
    if (data.payload.migrationError) {
      return [
        {
          ...data,
          message: `${data.payload.migrationError.migrationError.message}`,
        },
      ];
    }
  }

  isApplicable(action: any): boolean {
    return action.type === 'migrationError';
  }
}
