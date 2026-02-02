import { expect } from 'chai';
import * as map from '../../../src/utils/map';
import { actionMapper, requests } from '../../../src/utils/constants';

describe('Map Utils', () => {
  let mapInstance: Map<string, any>;

  beforeEach(() => {
    mapInstance = map.getMapInstance();
    mapInstance.clear();
  });

  it('should export map functions', () => {
    expect(map).to.exist;
    expect(map).to.be.an('object');
  });

  it('should get map instance', () => {
    const instance = map.getMapInstance();
    expect(instance).to.be.instanceOf(Map);
  });

  it('should get value from map', () => {
    map.set('test-key', mapInstance, 'test-value');
    const result = map.get('test-key', mapInstance);
    expect(result).to.equal('test-value');
  });

  it('should create key with default data if does not exist', () => {
    const defaultData = { key: 'value' };
    const result = map.get('new-key', mapInstance, defaultData);
    expect(result).to.deep.equal(defaultData);
  });

  it('should set value in map', () => {
    const result = map.set('test-key', mapInstance, 'test-value');
    expect(result).to.be.instanceOf(Map);
    expect(map.get('test-key', mapInstance)).to.equal('test-value');
  });

  it('should remove value from map', () => {
    map.set('test-key', mapInstance, 'test-value');
    const result = map.remove('test-key', mapInstance);
    expect(result).to.be.true;
    // After removal, get with default returns the default value (empty array)
    expect(map.get('test-key', mapInstance, [])).to.deep.equal([]);
  });

  it('should get data with action', () => {
    const data = {
      action1: { key: 'value1' },
      action2: { key: 'value2' },
    };
    map.set('test-id', mapInstance, data);
    const result = map.getDataWithAction('test-id', mapInstance, 'action1');
    expect(result).to.deep.equal({ key: 'value1' });
  });

  it('should reset map instance', () => {
    map.set('some-key', mapInstance, 'some-value');
    map.resetMapInstance(mapInstance);
    expect(map.get(actionMapper, mapInstance)).to.deep.equal([]);
    expect(map.get(requests, mapInstance)).to.deep.equal([]);
  });
});
