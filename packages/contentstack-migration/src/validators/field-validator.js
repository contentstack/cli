'use strict';

class FieldValidator {
  validate(data) {
    if (data.payload.field) {
      return [{
        ...data,
        message: data.payload.field.message
      }];
    } else {
      return [];
    }
  }
  isApplicable(action) {
    return action.type === 'field';
  }
}

module.exports = FieldValidator;