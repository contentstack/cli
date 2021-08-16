'use strict';

const BaseValidator = require('./base-validator'),
  // Utils
  { constants } = require('../utils'),
  // Constants
  { deriveLinkedEntriesProperties } = constants;

class DeriveLinkedEntriesValidator extends BaseValidator {

  validate(data) {
    const errors = this.commonValidate(deriveLinkedEntriesProperties, data);
    return errors;
  }

  isApplicable(action) {
    return action.type === 'deriveLinkedEntries';
  }
}

module.exports = DeriveLinkedEntriesValidator;