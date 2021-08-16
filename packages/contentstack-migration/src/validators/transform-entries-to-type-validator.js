'use strict';

const BaseValidator = require('./base-validator'),
  // Utils
  { constants } = require('../utils'),
  // Constants
  { transformEntriesToTypeProperties } = constants;

class TransformEntriesToTypeValidator extends BaseValidator {
  validate(data) {
    const errors = this.commonValidate(transformEntriesToTypeProperties, data);
    return errors;
  }

  isApplicable(action) {
    return action.type === 'transformEntriesToType';
  }
}

module.exports = TransformEntriesToTypeValidator;