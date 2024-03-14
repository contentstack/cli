'use strict';

class MigrationError {
  validate(data) {
    if (data.payload.migrationError) {
      return [
        {
          ...data,
          message: `${data.payload.migrationError.migrationError.message}`,
        },
      ];
    }
  }

  isApplicable(action) {
    return action.type === 'migrationError';
  }
}

module.exports = MigrationError;
