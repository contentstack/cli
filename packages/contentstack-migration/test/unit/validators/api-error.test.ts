import { expect } from 'chai';
import ApiError from '../../../src/validators/api-error';

describe('API Error Validator', () => {
  let validator: ApiError;

  beforeEach(() => {
    validator = new ApiError();
  });

  it('should return error when apiError exists in payload', () => {
    const data = {
      type: 'apiError',
      payload: {
        apiError: {
          error_message: 'API request failed',
        },
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'API request failed');
    expect(result[0]).to.have.property('type', 'apiError');
  });

  it('should return empty array when apiError does not exist', () => {
    const data = {
      type: 'apiError',
      payload: {},
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(0);
  });

  it('should be applicable for apiError type', () => {
    const action = { type: 'apiError' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should not be applicable for other types', () => {
    const action = { type: 'field' };
    expect(validator.isApplicable(action)).to.be.false;
  });
});
