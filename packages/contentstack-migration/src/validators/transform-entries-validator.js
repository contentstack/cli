'use strict';

const BaseValidator = require('./base-validator'),
  // Utils
  { constants } = require('../utils'),
  // Constants
  { transformEntriesProperties } = constants;

class TransformEntriesValidator extends BaseValidator {

  validate(data) {
    const errors = this.commonValidate(transformEntriesProperties, data);
    return errors;
  }

  isApplicable(action) {
    return action.type === 'transformEntries';
  }
}

module.exports = TransformEntriesValidator;