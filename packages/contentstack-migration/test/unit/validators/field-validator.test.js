'use strict';

const { expect } = require('chai');
const FieldValidator = require('../../../src/validators/field-validator');

describe('FieldValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new FieldValidator();
  });

  describe('isApplicable', () => {
    it('should return true for field action type', () => {
      const action = { type: 'field' };
      expect(validator.isApplicable(action)).to.be.true;
    });

    it('should return false for other action types', () => {
      const action = { type: 'create' };
      expect(validator.isApplicable(action)).to.be.false;
    });
  });

  describe('validate', () => {
    it('should return error if field error exists in payload', () => {
      const action = {
        type: 'field',
        payload: {
          field: {
            message: 'Field validation error',
          },
        },
      };

      const errors = validator.validate(action);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.equal('Field validation error');
      expect(errors[0].type).to.equal('field');
    });

    it('should return empty array if no field error', () => {
      const action = {
        type: 'field',
        payload: {},
      };

      const errors = validator.validate(action);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should preserve action metadata in error', () => {
      const action = {
        type: 'field',
        meta: {
          callsite: {
            file: 'test.js',
            line: 10,
          },
        },
        payload: {
          field: {
            message: 'Field error',
          },
        },
      };

      const errors = validator.validate(action);
      expect(errors[0].meta).to.deep.equal(action.meta);
    });
  });
});
