import { expect } from 'chai';
import { stub, restore, SinonStub } from 'sinon';
import contentstackSdk from '../../../src/utils/contentstack-sdk';
import * as mapModule from '../../../src/utils/map';
import { SDK_ACTIONS, MANAGEMENT_SDK } from '../../../src/utils/constants';

describe('Contentstack SDK', () => {
  let getMapInstanceStub: SinonStub;
  let getStub: SinonStub;
  let mockStack: any;
  let mockMapInstance: Map<string, any>;

  beforeEach(() => {
    restore();
    mockMapInstance = new Map();
    mockStack = {
      contentType: stub().returns({
        fetch: stub().resolves({ uid: 'test-uid' }),
        create: stub().resolves({ uid: 'test-uid' }),
        update: stub().resolves({ uid: 'test-uid' }),
        delete: stub().resolves({}),
      }),
    };

    const mockManagementSdk = {
      stack: mockStack,
    };

    getMapInstanceStub = stub(mapModule, 'getMapInstance').returns(mockMapInstance);
    getStub = stub(mapModule, 'get').returns(mockManagementSdk);
    stub(mapModule, 'getDataWithAction').returns({});
  });

  afterEach(() => {
    restore();
  });

  it('should export contentstackSdk function', () => {
    expect(contentstackSdk).to.exist;
    expect(contentstackSdk).to.be.a('function');
  });

  it('should return a function when called', () => {
    const result = contentstackSdk({
      action: 'create',
      id: 'test-id',
      sdkAction: SDK_ACTIONS.CONTENTTYPE_POST,
    });

    expect(result).to.be.a('function');
  });

  it('should handle CONTENTTYPE_GET action', async () => {
    const sdk = contentstackSdk({
      action: 'get',
      id: 'test-id',
      sdkAction: SDK_ACTIONS.CONTENTTYPE_GET,
    });

    const result = await sdk(null);

    expect(mockStack.contentType.calledWith('test-id')).to.be.true;
  });

  it('should handle CONTENTTYPE_POST action', async () => {
    const sdk = contentstackSdk({
      action: 'create',
      id: 'test-id',
      sdkAction: SDK_ACTIONS.CONTENTTYPE_POST,
    });

    const result = await sdk({ title: 'Test' });

    expect(mockStack.contentType.called).to.be.true;
  });
});
