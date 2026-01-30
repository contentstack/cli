'use strict';

const { expect } = require('chai');
const EditContentTypeValidator = require('../../../src/validators/edit-content-type-validator');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { actions } = constants;
const { resetMap } = require('../../setup/test-helpers');

describe('EditContentTypeValidator', () => {
  let validator;
  let mapInstance;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
    validator = new EditContentTypeValidator();
  });

  describe('isApplicable', () => {
    it('should return true for edit action', () => {
      const action = { type: 'edit' };
      expect(validator.isApplicable(action)).to.be.true;
    });

    it('should return false for other actions', () => {
      const action = { type: 'create' };
      expect(validator.isApplicable(action)).to.be.false;
    });
  });

  describe('validate', () => {
    it('should pass validation for valid content type', () => {
      const contentTypeData = {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            schema: [],
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'edit',
        payload: {
          contentTypeId: 'blog',
          action: actions.EDIT_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should fail validation if uid is missing', () => {
      const contentTypeData = {
        [actions.EDIT_CT]: {
          content_type: {
            title: 'Blog',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'edit',
        payload: {
          contentTypeId: 'blog',
          action: actions.EDIT_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('uid is missing'))).to.be.true;
    });

    it('should fail validation if title is missing', () => {
      const contentTypeData = {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'blog',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'edit',
        payload: {
          contentTypeId: 'blog',
          action: actions.EDIT_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('title is missing'))).to.be.true;
    });

    it('should fail validation if invalid property is provided', () => {
      const contentTypeData = {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
            invalidProperty: 'invalid',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'edit',
        payload: {
          contentTypeId: 'blog',
          action: actions.EDIT_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.be.greaterThan(0);
      expect(errors.some((e) => e.message.includes('invalidProperty is not valid property'))).to.be.true;
    });

    it('should not require description for edit', () => {
      const contentTypeData = {
        [actions.EDIT_CT]: {
          content_type: {
            uid: 'blog',
            title: 'Blog',
          },
        },
      };
      _map.set('blog', mapInstance, contentTypeData);

      const action = {
        type: 'edit',
        payload: {
          contentTypeId: 'blog',
          action: actions.EDIT_CT,
        },
      };

      const errors = validator.validate(action);
      expect(errors.length).to.equal(0);
    });
  });

  describe('getPropertyNames', () => {
    it('should return valid content type properties', () => {
      const properties = validator.getPropertyNames();
      expect(properties).to.be.an('array');
      expect(properties).to.include('uid');
      expect(properties).to.include('title');
      expect(properties).to.include('schema');
    });
  });
});
