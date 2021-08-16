'use strict';

class ApiError {
  validate(data) {
    if (data.payload.apiError) {
      return [{
        ...data,
        message: `${data.payload.apiError.error_message}`
      }]
    } else {
      return [];
    }
  }
  isApplicable(action) {
    return action.type === 'apiError';
  }
}
module.exports = ApiError;