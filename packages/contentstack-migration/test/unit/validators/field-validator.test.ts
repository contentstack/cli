import { expect } from 'chai';
import FieldValidator from '../../../src/validators/field-validator';

describe('Field Validator', () => {
  let validator: FieldValidator;

  beforeEach(() => {
    validator = new FieldValidator();
  });

  it('should export FieldValidator class', () => {
    expect(FieldValidator).to.exist;
  });

  it('should be instantiable', () => {
    expect(validator).to.be.instanceOf(FieldValidator);
  });

  describe('validate', () => {
    it('should return empty array when field is not present', () => {
      const data = {
        type: 'field',
        payload: {},
      };
      const errors = validator.validate(data);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should return error when field is present', () => {
      const data = {
        type: 'field',
        payload: {
          field: {
            message: 'Field validation error',
          },
        },
      };
      const errors = validator.validate(data);
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.equal('Field validation error');
    });
  });

  describe('isApplicable', () => {
    it('should return true when type is field', () => {
      const action = { type: 'field' };
      expect(validator.isApplicable(action)).to.be.true;
    });

    it('should return false when type is not field', () => {
      const action = { type: 'create' };
      expect(validator.isApplicable(action)).to.be.false;
    });
  });
});
