'use strict';

const { expect } = require('chai');
const CreateContentTypeValidator = require('../../../src/validators/create-content-type-validator');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { actions } = constants;
const { resetMap } = require('../../setup/test-helpers');

describe('CreateContentTypeValidator', () => {
  let validator;
  let mapInstance;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
    validator = new CreateContentTypeValidator();
  });

  describe('isApplicable', () => {
    it('should return true for create action', () => {
      const action = { type: 'create' };
      expect(validator.isApplicable(action)).to.be.true;
    });

    it('should return false for other actions', () => {
      const action = { type: 'edit' };
      expect(validator.isApplicable(action)).to.be.false;
    });
  });

  describe('validate', () => {
    it('should pass validation for valid content type', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            description: 'Blog description',
            schema: [],
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should fail validation if uid is missing', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            title: 'Blog',
            description: 'Blog description',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors[0].message).to.include('uid is missing');
    });

    it('should fail validation if title is missing', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'blog',
            description: 'Blog description',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('title is missing'))).to.be.true;
    });

    it('should fail validation if description is missing', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('description is missing'))).to.be.true;
    });

    it('should fail validation if invalid property is provided', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            description: 'Blog description',
            invalidProperty: 'invalid',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('invalidProperty is not valid property'))).to.be.true;
    });

    it('should validate multiple errors', () => {
      const contentTypeData = {
        [actions.CREATE_CT]: {
          content_type: {
            invalidProperty: 'invalid',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'create',
        payload: {
          contentTypeId: 'blog',
          action: actions.CREATE_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(1);
    });
  });

  describe('getPropertyNames', () => {
    it('should return valid content type properties', () => {
      const properties = validator.getPropertyNames();
      expect(properties).to.be.an('array');
      expect(properties).to.include('uid');
      expect(properties).to.include('title');
      expect(properties).to.include('description');
      expect(properties).to.include('schema');
    });
  });
});
