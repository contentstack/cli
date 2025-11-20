'use strict';

const { expect } = require('chai');
const { map: _map, constants } = require('../../../src/utils');
const { getMapInstance, resetMapInstance } = _map;
const { resetMap } = require('../../setup/test-helpers');

describe('Map Utils', () => {
  let mapInstance;

  beforeEach(() => {
    resetMap();
    mapInstance = getMapInstance();
  });

  describe('getMapInstance', () => {
    it('should return a Map instance', () => {
      const instance = getMapInstance();
      expect(instance).to.be.instanceof(Map);
    });

    it('should return the same instance on multiple calls', () => {
      const instance1 = getMapInstance();
      const instance2 = getMapInstance();
      expect(instance1).to.equal(instance2);
    });
  });

  describe('get', () => {
    it('should get value from map', () => {
      mapInstance.set('test-key', 'test-value');
      const value = _map.get('test-key', mapInstance);
      expect(value).to.equal('test-value');
    });

    it('should return default value if key does not exist', () => {
      const defaultValue = [];
      const value = _map.get('nonexistent', mapInstance, defaultValue);
      expect(value).to.equal(defaultValue);
    });

    it('should create key with default value if it does not exist', () => {
      const defaultValue = [];
      _map.get('new-key', mapInstance, defaultValue);
      expect(mapInstance.has('new-key')).to.be.true;
      expect(mapInstance.get('new-key')).to.equal(defaultValue);
    });
  });

  describe('set', () => {
    it('should set value in map', () => {
      _map.set('test-key', mapInstance, 'test-value');
      expect(mapInstance.get('test-key')).to.equal('test-value');
    });

    it('should overwrite existing value', () => {
      mapInstance.set('test-key', 'old-value');
      _map.set('test-key', mapInstance, 'new-value');
      expect(mapInstance.get('test-key')).to.equal('new-value');
    });
  });

  describe('remove', () => {
    it('should remove key from map', () => {
      mapInstance.set('test-key', 'test-value');
      _map.remove('test-key', mapInstance);
      expect(mapInstance.has('test-key')).to.be.false;
    });

    it('should not throw error if key does not exist', () => {
      expect(() => _map.remove('nonexistent', mapInstance)).to.not.throw();
    });
  });

  describe('getDataWithAction', () => {
    it('should get data with specific action', () => {
      const data = {
        CREATE_CT: { content_type: { uid: 'blog', title: 'Blog' } },
        EDIT_CT: { content_type: { uid: 'blog', title: 'Updated Blog' } },
      };
      mapInstance.set('blog', data);

      const result = _map.getDataWithAction('blog', mapInstance, 'CREATE_CT');
      expect(result.content_type.uid).to.equal('blog');
      expect(result.content_type.title).to.equal('Blog');
    });

    it('should return undefined if action does not exist', () => {
      const data = {
        CREATE_CT: { content_type: { uid: 'blog' } },
      };
      mapInstance.set('blog', data);

      const result = _map.getDataWithAction('blog', mapInstance, 'EDIT_CT');
      expect(result).to.be.undefined;
    });
  });

  describe('resetMapInstance', () => {
    it('should reset actionMapper and requests', () => {
      const { actionMapper, requests } = constants;
      mapInstance.set(actionMapper, [{ type: 'test' }]);
      mapInstance.set(requests, [{ title: 'test' }]);

      resetMapInstance(mapInstance);

      const actions = _map.get(actionMapper, mapInstance);
      const _requests = _map.get(requests, mapInstance);
      expect(actions).to.be.an('array');
      expect(actions.length).to.equal(0);
      expect(_requests).to.be.an('array');
      expect(_requests.length).to.equal(0);
    });
  });
});
