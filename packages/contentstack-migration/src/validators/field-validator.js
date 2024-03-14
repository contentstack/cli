'use strict';

class FieldValidator {
  validate(data) {
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

  isApplicable(action) {
    return action.type === 'field';
  }
}

module.exports = FieldValidator;
