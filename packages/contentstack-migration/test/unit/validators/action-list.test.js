'use strict';

const { expect } = require('chai');
const ActionList = require('../../../src/actions/action-list');

describe('ActionList', () => {
  describe('constructor', () => {
    it('should initialize with empty validators array', () => {
      const actionList = new ActionList();
      expect(actionList.validators).to.be.an('array');
      expect(actionList.validators.length).to.equal(0);
    });

    it('should initialize with actionList', () => {
      const actions = [{ type: 'create' }];
      const actionList = new ActionList(actions);
      expect(actionList.actionList).to.deep.equal(actions);
    });

    it('should initialize with typeErrors', () => {
      const typeErrors = ['error1'];
      const actionList = new ActionList(null, typeErrors);
      expect(actionList.typeErrors).to.deep.equal(typeErrors);
    });
  });

  describe('addValidators', () => {
    it('should add validator to validators array', () => {
      const actionList = new ActionList();
      const validator = { isApplicable: () => true, validate: () => [] };
      actionList.addValidators(validator);
      expect(actionList.validators.length).to.equal(1);
      expect(actionList.validators[0]).to.equal(validator);
    });

    it('should add multiple validators', () => {
      const actionList = new ActionList();
      const validator1 = { isApplicable: () => true, validate: () => [] };
      const validator2 = { isApplicable: () => true, validate: () => [] };
      actionList.addValidators(validator1);
      actionList.addValidators(validator2);
      expect(actionList.validators.length).to.equal(2);
    });
  });

  describe('validate', () => {
    it('should return empty array if no actions', () => {
      const actionList = new ActionList([]);
      const validator = { isApplicable: () => true, validate: () => [] };
      actionList.addValidators(validator);
      const errors = actionList.validate();
      expect(errors).to.be.an('array');
      expect(errors.length).to.equal(0);
    });

    it('should validate actions using applicable validators', () => {
      const actions = [{ type: 'create' }];
      const actionList = new ActionList(actions);
      const validator = {
        isApplicable: (action) => action.type === 'create',
        validate: () => [{ message: 'Error' }],
      };
      actionList.addValidators(validator);
      const errors = actionList.validate();
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.equal('Error');
    });

    it('should skip validators that are not applicable', () => {
      const actions = [{ type: 'create' }];
      const actionList = new ActionList(actions);
      const applicableValidator = {
        isApplicable: (action) => action.type === 'create',
        validate: () => [{ message: 'Error' }],
      };
      const nonApplicableValidator = {
        isApplicable: (action) => action.type === 'edit',
        validate: () => [{ message: 'Should not appear' }],
      };
      actionList.addValidators(applicableValidator);
      actionList.addValidators(nonApplicableValidator);
      const errors = actionList.validate();
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.equal('Error');
    });

    it('should validate multiple actions', () => {
      const actions = [{ type: 'create' }, { type: 'edit' }];
      const actionList = new ActionList(actions);
      const createValidator = {
        isApplicable: (action) => action.type === 'create',
        validate: () => [{ message: 'Create error' }],
      };
      const editValidator = {
        isApplicable: (action) => action.type === 'edit',
        validate: () => [{ message: 'Edit error' }],
      };
      actionList.addValidators(createValidator);
      actionList.addValidators(editValidator);
      const errors = actionList.validate();
      // Note: ActionList breaks after first applicable validator per action,
      // so each action gets validated by its first applicable validator
      expect(errors.length).to.be.greaterThan(0);
    });

    it('should break after first applicable validator', () => {
      const actions = [{ type: 'create' }];
      const actionList = new ActionList(actions);
      const validator1 = {
        isApplicable: (action) => action.type === 'create',
        validate: () => [{ message: 'First error' }],
      };
      const validator2 = {
        isApplicable: (action) => action.type === 'create',
        validate: () => [{ message: 'Second error' }],
      };
      actionList.addValidators(validator1);
      actionList.addValidators(validator2);
      const errors = actionList.validate();
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.equal('First error');
    });
  });
});
