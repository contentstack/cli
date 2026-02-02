import { expect } from 'chai';
import TypeError from '../../../src/validators/type-error';

describe('Type Error Validator', () => {
  let validator: TypeError;

  beforeEach(() => {
    validator = new TypeError();
  });

  it('should return error when typeErrors exists in payload', () => {
    const data = {
      type: 'typeError',
      payload: {
        typeErrors: ['invalidFunction'],
      },
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(1);
    expect(result[0]).to.have.property('message', 'invalidFunction is not a valid function');
    expect(result[0]).to.have.property('type', 'typeError');
  });

  it('should return empty array when typeErrors does not exist', () => {
    const data = {
      type: 'typeError',
      payload: {},
    };

    const result = validator.validate(data);

    expect(result).to.be.an('array');
    expect(result).to.have.length(0);
  });

  it('should be applicable for typeError type', () => {
    const action = { type: 'typeError' };
    expect(validator.isApplicable(action)).to.be.true;
  });

  it('should not be applicable for other types', () => {
    const action = { type: 'field' };
    expect(validator.isApplicable(action)).to.be.false;
  });
});
