import { expect } from 'chai';
import * as configIndex from '../../../src/config/index';

describe('Config Index', () => {
  it('should export apiConfig, defaultOptions, and masterLocale', () => {
    expect(configIndex.apiConfig).to.exist;
    expect(configIndex.defaultOptions).to.exist;
    expect(configIndex.masterLocale).to.exist;
  });
});
