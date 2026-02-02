import { expect } from 'chai';
import getBatches from '../../../src/utils/get-batches';

describe('Get Batches', () => {
  it('should return array with single index when count is less than batchLimit', () => {
    const result = getBatches(5, 10);
    expect(result).to.deep.equal([0]);
  });

  it('should return array with single index when count equals batchLimit', () => {
    const result = getBatches(10, 10);
    expect(result).to.deep.equal([0]);
  });

  it('should return array with multiple indexes when count exceeds batchLimit', () => {
    const result = getBatches(25, 10);
    expect(result).to.deep.equal([0, 1, 2]);
  });

  it('should handle exact multiples of batchLimit', () => {
    const result = getBatches(30, 10);
    expect(result).to.deep.equal([0, 1, 2]);
  });

  it('should handle count that requires rounding up', () => {
    const result = getBatches(21, 10);
    expect(result).to.deep.equal([0, 1, 2]);
  });

  it('should return empty array when count is 0', () => {
    const result = getBatches(0, 10);
    // Math.ceil(0/10) = 0, new Array(0) creates empty array
    expect(result).to.deep.equal([]);
  });

  it('should handle large batchLimit', () => {
    const result = getBatches(100, 50);
    expect(result).to.deep.equal([0, 1]);
  });

  it('should handle small batchLimit', () => {
    const result = getBatches(5, 2);
    expect(result).to.deep.equal([0, 1, 2]);
  });
});
