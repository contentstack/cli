import { expect } from 'chai';
import * as utilsIndex from '../../../src/utils/index';

describe('Utils Index', () => {
  it('should export all utility modules', () => {
    expect(utilsIndex.map).to.exist;
    expect(utilsIndex.constants).to.exist;
    expect(utilsIndex.schemaHelper).to.exist;
    expect(utilsIndex.objectHelper).to.exist;
    expect(utilsIndex.fsHelper).to.exist;
    expect(utilsIndex.logger).to.exist;
    expect(utilsIndex.https).to.exist;
    expect(utilsIndex.safePromise).to.exist;
    expect(utilsIndex.getConfig).to.exist;
    expect(utilsIndex.successHandler).to.exist;
    expect(utilsIndex.getCallsite).to.exist;
    expect(utilsIndex.errorHelper).to.exist;
    expect(utilsIndex.groupBy).to.exist;
    expect(utilsIndex.getBatches).to.exist;
    expect(utilsIndex.autoRetry).to.exist;
    expect(utilsIndex.contentstackSdk).to.exist;
    expect(utilsIndex.installModules).to.exist;
  });
});
