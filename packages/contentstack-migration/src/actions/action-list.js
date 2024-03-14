/* eslint-disable no-unused-expressions */
'use strict';

class ActionList {
  constructor(actionList, typeErrors) {
    typeErrors && (this.typeErrors = typeErrors);
    actionList && (this.actionList = actionList);
    this.validators = [];
  }

  addValidators(validator) {
    this.validators.push(validator);
  }

  validate() {
    const { validators, actionList } = this;

    let errors = [];
    for (const action of actionList) {
      for (const validator of validators) {
        if (validator.isApplicable(action)) {
          errors = validator.validate(action);
          break;
        }
      }
    }

    return errors;
  }
}

module.exports = ActionList;
