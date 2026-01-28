import { expect } from 'chai';
import getCallsite from '../../../src/utils/callsite';

describe('Callsite', () => {
  it('should export getCallsite function', () => {
    expect(getCallsite).to.exist;
    expect(getCallsite).to.be.a('function');
  });

  it('should return a callsite object when called', () => {
    const callsite = getCallsite();
    expect(callsite).to.exist;
    // Callsite should have methods like getFileName, getLineNumber, etc.
    if (callsite) {
      expect(callsite.getFileName).to.be.a('function');
    }
  });

  it('should return external file callsite (not from callsite.ts itself)', () => {
    // When called from a test file, it should return the test file's callsite
    const callsite = getCallsite();
    if (callsite) {
      const fileName = callsite.getFileName();
      expect(fileName).to.exist;
      // Should not be the callsite.ts file itself
      expect(fileName).to.not.include('callsite.ts');
    }
  });
});
