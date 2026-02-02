import { expect } from 'chai';
import BaseValidator from '../../../src/validators/base-validator';

describe('Base Validator', () => {
  let validator: BaseValidator;

  beforeEach(() => {
    validator = new BaseValidator();
  });

  it('should export BaseValidator class', () => {
    expect(BaseValidator).to.exist;
  });

  it('should be instantiable', () => {
    expect(validator).to.be.instanceOf(BaseValidator);
  });

  describe('commonValidate', () => {
    it('should return empty array when all mandatory properties are present', () => {
      const properties = [
        { name: 'field1', type: 'string', mandatory: true },
        { name: 'field2', type: 'number', mandatory: false },
      ];
      const data = {
        payload: {
          options: {
            field1: 'value1',
            field2: 123,
          },
        },
      };
      const errors = validator.commonValidate(properties, data);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should return error when mandatory property is missing', () => {
      const properties = [
        { name: 'field1', type: 'string', mandatory: true },
      ];
      const data = {
        payload: {
          options: {},
        },
      };
      const errors = validator.commonValidate(properties, data);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors[0].message).to.include('field1 is required');
    });

    it('should return error when type mismatch', () => {
      const properties = [
        { name: 'field1', type: 'string', mandatory: true },
      ];
      const data = {
        payload: {
          options: {
            field1: 123, // number instead of string
          },
        },
      };
      const errors = validator.commonValidate(properties, data);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors[0].message).to.include('is a number type');
    });

    it('should return error when dependsOn property is missing', () => {
      const properties = [
        { name: 'field1', type: 'string', mandatory: false, dependsOn: 'field2' },
      ];
      const data = {
        payload: {
          options: {
            field1: 'value1',
            // field2 is missing
          },
        },
      };
      const errors = validator.commonValidate(properties, data);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors[0].message).to.include('field2 is required with field1');
    });

    it('should not return error when dependsOn property is present', () => {
      const properties = [
        { name: 'field1', type: 'string', mandatory: false, dependsOn: 'field2' },
      ];
      const data = {
        payload: {
          options: {
            field1: 'value1',
            field2: 'value2',
          },
        },
      };
      const errors = validator.commonValidate(properties, data);
      expect(errors.length).to.equal(0);
    });
  });

  describe('getDataType', () => {
    it('should return "array" for arrays', () => {
      expect(validator.getDataType([])).to.equal('array');
      expect(validator.getDataType([1, 2, 3])).to.equal('array');
    });

    it('should return "string" for strings', () => {
      expect(validator.getDataType('test')).to.equal('string');
    });

    it('should return "number" for numbers', () => {
      expect(validator.getDataType(123)).to.equal('number');
    });

    it('should return "boolean" for booleans', () => {
      expect(validator.getDataType(true)).to.equal('boolean');
      expect(validator.getDataType(false)).to.equal('boolean');
    });

    it('should return "object" for objects', () => {
      expect(validator.getDataType({})).to.equal('object');
    });
  });
});
