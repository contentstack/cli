import { expect } from 'chai';
import {
  version,
  defaultDataType,
  MAX_RETRY,
  actions,
  errorMessageHandler,
  successMessageHandler,
  batchLimit,
  limit,
} from '../../../src/utils/constants';

describe('Constants', () => {
  it('should export version as number', () => {
    expect(version).to.be.a('number');
    expect(version).to.equal(3);
  });

  it('should export defaultDataType', () => {
    expect(defaultDataType).to.be.a('string');
    expect(defaultDataType).to.equal('text');
  });

  it('should export MAX_RETRY', () => {
    expect(MAX_RETRY).to.be.a('number');
    expect(MAX_RETRY).to.equal(3);
  });

  it('should export actions object', () => {
    expect(actions).to.be.an('object');
    expect(actions.CREATE_CT).to.equal('CREATE_CT');
    expect(actions.EDIT_CT).to.equal('EDIT_CT');
    expect(actions.DELETE_CT).to.equal('DELETE_CT');
  });

  it('should export errorMessageHandler', () => {
    expect(errorMessageHandler).to.be.an('object');
    expect(errorMessageHandler.POST).to.equal('saving');
    expect(errorMessageHandler.GET).to.equal('fetching');
    expect(errorMessageHandler.PUT).to.equal('updating');
    expect(errorMessageHandler.DELETE).to.equal('deleting');
  });

  it('should export successMessageHandler', () => {
    expect(successMessageHandler).to.be.an('object');
    expect(successMessageHandler.POST).to.equal('saved');
    expect(successMessageHandler.GET).to.equal('fetched');
    expect(successMessageHandler.PUT).to.equal('updated');
    expect(successMessageHandler.DELETE).to.equal('deleted');
  });

  it('should export batchLimit', () => {
    expect(batchLimit).to.be.a('number');
    expect(batchLimit).to.equal(20);
  });

  it('should export limit', () => {
    expect(limit).to.be.a('number');
    expect(limit).to.equal(1);
  });
});
