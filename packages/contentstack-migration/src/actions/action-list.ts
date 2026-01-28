/* eslint-disable no-unused-expressions */
export default class ActionList {
  typeErrors?: any;
  actionList?: any[];
  validators: any[];

  constructor(actionList?: any[], typeErrors?: any) {
    typeErrors && (this.typeErrors = typeErrors);
    actionList && (this.actionList = actionList);
    this.validators = [];
  }

  addValidators(validator: any): void {
    this.validators.push(validator);
  }

  validate(): any[] {
    const { validators, actionList } = this;

    if (!actionList) {
      return [];
    }

    let errors: any[] = [];
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
