import { expect } from 'chai';
import getConfig from '../../../src/utils/get-config';

describe('Get Config', () => {
  it('should return config with method and default path', () => {
    const result = getConfig({ method: 'POST' });

    expect(result).to.have.property('method', 'POST');
    expect(result).to.have.property('path');
    expect(result.path).to.include('/v3');
    expect(result).to.have.property('headers');
  });

  it('should include custom path when provided', () => {
    const result = getConfig({ method: 'GET', path: '/content-types' });

    expect(result).to.have.property('method', 'GET');
    expect(result.path).to.equal('/v3/content-types');
  });

  it('should include sdkAction when provided', () => {
    const result = getConfig({ method: 'PUT', sdkAction: 'CONTENTTYPE_PUT' });

    expect(result).to.have.property('method', 'PUT');
    expect(result).to.have.property('sdkAction', 'CONTENTTYPE_PUT');
  });

  it('should not include sdkAction when undefined', () => {
    const result = getConfig({ method: 'DELETE' });

    // sdkAction should not be present when not provided
    expect(result.sdkAction).to.be.undefined;
  });

  it('should have headers object', () => {
    const result = getConfig({ method: 'POST' });

    expect(result.headers).to.be.an('object');
    expect(result.headers).to.not.equal(undefined);
  });

  it('should handle all parameters together', () => {
    const result = getConfig({
      method: 'POST',
      path: '/entries',
      sdkAction: 'ENTRY_POST',
    });

    expect(result).to.have.property('method', 'POST');
    expect(result.path).to.equal('/v3/entries');
    expect(result).to.have.property('sdkAction', 'ENTRY_POST');
  });
});
