'use strict';

class _TypeError {
  constructor() {}

  validate(data) {
    if (data.payload.typeErrors) {
      return [
        {
          ...data,
          message: `${data.payload.typeErrors[0]} is not a valid function`,
        },
      ];
    }
    return [];
  }

  isApplicable(action) {
    return action.type === 'typeError';
  }
}
module.exports = _TypeError;
