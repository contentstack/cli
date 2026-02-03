import { expect } from 'chai';
import ActionList from '../../../src/actions/action-list';

describe('ActionList', () => {
  describe('constructor', () => {
    it('should initialize with actionList and typeErrors', () => {
      const actionList = [{ type: 'create' }];
      const typeErrors = { create: 'error' };
      const instance = new ActionList(actionList, typeErrors);
      expect(instance.actionList).to.deep.equal(actionList);
      expect(instance.typeErrors).to.deep.equal(typeErrors);
      expect(instance.validators).to.deep.equal([]);
    });

    it('should initialize with empty arrays when no params', () => {
      const instance = new ActionList();
      expect(instance.actionList).to.be.undefined;
      expect(instance.typeErrors).to.be.undefined;
      expect(instance.validators).to.deep.equal([]);
    });
  });

  describe('addValidators', () => {
    it('should add validator to validators array', () => {
      const instance = new ActionList();
      const validator = { isApplicable: () => true, validate: (): any[] => [] };
      instance.addValidators(validator);
      expect(instance.validators).to.have.length(1);
      expect(instance.validators[0]).to.equal(validator);
    });

    it('should add multiple validators', () => {
      const instance = new ActionList();
      const validator1 = { isApplicable: () => true, validate: (): any[] => [] };
      const validator2 = { isApplicable: () => true, validate: (): any[] => [] };
      instance.addValidators(validator1);
      instance.addValidators(validator2);
      expect(instance.validators).to.have.length(2);
    });
  });

  describe('validate', () => {
    it('should return empty array when no actionList', () => {
      const instance = new ActionList(undefined);
      const errors = instance.validate();
      expect(errors).to.deep.equal([]);
    });

    it('should return empty array when no validators', () => {
      const actionList = [{ type: 'create' }];
      const instance = new ActionList(actionList);
      const errors = instance.validate();
      expect(errors).to.deep.equal([]);
    });

    it('should validate actions with applicable validator', () => {
      const actionList = [{ type: 'create', payload: {} }];
      const errors = [{ message: 'error' }];
      const validator = {
        isApplicable: (action: any) => action.type === 'create',
        validate: () => errors,
      };
      const instance = new ActionList(actionList);
      instance.addValidators(validator);
      const result = instance.validate();
      expect(result).to.deep.equal(errors);
    });

    it('should skip non-applicable validators', () => {
      const actionList = [{ type: 'create', payload: {} }];
      const validator1 = {
        isApplicable: () => false,
        validate: () => [{ message: 'should not run' }],
      };
      const validator2 = {
        isApplicable: () => true,
        validate: () => [{ message: 'should run' }],
      };
      const instance = new ActionList(actionList);
      instance.addValidators(validator1);
      instance.addValidators(validator2);
      const result = instance.validate();
      expect(result).to.deep.equal([{ message: 'should run' }]);
    });

    it('should break after first applicable validator', () => {
      const actionList = [{ type: 'create', payload: {} }];
      const validator1 = {
        isApplicable: () => true,
        validate: () => [{ message: 'first' }],
      };
      const validator2 = {
        isApplicable: () => true,
        validate: () => [{ message: 'second' }],
      };
      const instance = new ActionList(actionList);
      instance.addValidators(validator1);
      instance.addValidators(validator2);
      const result = instance.validate();
      expect(result).to.deep.equal([{ message: 'first' }]);
    });
  });
});
