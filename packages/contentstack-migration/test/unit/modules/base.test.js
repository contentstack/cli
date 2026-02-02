'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const Base = require('../../../src/modules/base');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { actionMapper } = constants;
const { actionCreators } = require('../../../src/actions');
const { createMockCallsite, resetMap } = require('../../setup/test-helpers');

describe('Base Module', () => {
  beforeEach(() => {
    resetMap();
    sinon.restore();
  });

  describe('constructor', () => {
    it('should initialize with id and action', () => {
      const base = new Base('test-id', 'test-action');
      expect(base.id).to.equal('test-id');
      expect(base.action).to.equal('test-action');
      expect(base.actions).to.be.an('array');
    });

    it('should initialize without parameters', () => {
      const base = new Base();
      expect(base.id).to.be.undefined;
      expect(base.action).to.be.undefined;
      expect(base.actions).to.be.an('array');
    });
  });

  describe('title', () => {
    it('should set title for content type', () => {
      const base = new Base('test-ct', 'CREATE_CT');
      const mapInstance = getMapInstance();
      const ctObj = {
        CREATE_CT: {
          content_type: {
            uid: 'test-ct',
            title: '',
          },
        },
      };
      _map.set('test-ct', mapInstance, ctObj);

      const result = base.title('Test Content Type');
      expect(result).to.equal(base);
      expect(ctObj.CREATE_CT.content_type.title).to.equal('Test Content Type');
    });
  });

  describe('description', () => {
    it('should set description for content type', () => {
      const base = new Base('test-ct', 'CREATE_CT');
      const mapInstance = getMapInstance();
      const ctObj = {
        CREATE_CT: {
          content_type: {
            uid: 'test-ct',
            description: '',
          },
        },
      };
      _map.set('test-ct', mapInstance, ctObj);

      const result = base.description('Test Description');
      expect(result).to.equal(base);
      expect(ctObj.CREATE_CT.content_type.description).to.equal('Test Description');
    });
  });

  describe('force', () => {
    it('should set force flag for content type', () => {
      const base = new Base('test-ct', 'DELETE_CT');
      const mapInstance = getMapInstance();
      const ctObj = {
        DELETE_CT: {
          content_type: {
            uid: 'test-ct',
            force: false,
          },
        },
      };
      _map.set('test-ct', mapInstance, ctObj);

      const result = base.force(true);
      expect(result).to.equal(base);
      expect(ctObj.DELETE_CT.content_type.force).to.equal(true);
    });
  });

  describe('dispatch', () => {
    it('should dispatch action for content type with id and opts', () => {
      const base = new Base();
      const callsite = createMockCallsite();
      const mapInstance = getMapInstance();
      sinon.stub(actionCreators.contentType, 'create').returns({ type: 'create', id: 'test-ct' });

      base.dispatch(callsite, 'test-ct', { title: 'Test' }, 'create');

      const actions = _map.get(actionMapper, mapInstance);
      expect(actions).to.be.an('array');
      expect(actions.length).to.equal(1);
      expect(actions[0].type).to.equal('create');

      actionCreators.contentType.create.restore();
    });

    it('should dispatch custom task action when id and opts are not provided', () => {
      const base = new Base();
      const callsite = createMockCallsite();
      const mapInstance = getMapInstance();
      sinon.stub(actionCreators, 'customTasks').returns({ type: 'customTask' });

      base.dispatch(callsite, null, null, null);

      const actions = _map.get(actionMapper, mapInstance);
      expect(actions).to.be.an('array');
      expect(actions.length).to.equal(1);
      expect(actions[0].type).to.equal('customTask');

      actionCreators.customTasks.restore();
    });
  });

  describe('getActions', () => {
    it('should return actions array', () => {
      const base = new Base();
      base.actions = [{ type: 'test' }];
      expect(base.getActions()).to.deep.equal([{ type: 'test' }]);
    });
  });
});
