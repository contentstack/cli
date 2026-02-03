import { expect } from 'chai';
import apiConfig from '../../../src/config/api-config';

describe('API Config', () => {
  it('should export api config object', () => {
    expect(apiConfig).to.exist;
    expect(apiConfig).to.be.an('object');
  });

  it('should have hostname property', () => {
    expect(apiConfig).to.have.property('hostname');
    expect(apiConfig.hostname).to.be.a('string');
  });

  it('should have version property', () => {
    expect(apiConfig).to.have.property('version');
    expect(apiConfig.version).to.be.a('string');
  });

  it('should have method property', () => {
    expect(apiConfig).to.have.property('method');
  });

  it('should have headers object', () => {
    expect(apiConfig).to.have.property('headers');
    expect(apiConfig.headers).to.be.an('object');
  });

  it('should have X-User-Agent in headers', () => {
    expect(apiConfig.headers).to.have.property('X-User-Agent');
    expect(apiConfig.headers['X-User-Agent']).to.include('@contentstack-migration');
  });
});
