import { expect } from 'chai';
import sinon from 'sinon';
import { HttpClient, authenticationHandler } from '@contentstack/cli-utilities';

import { AssetManagementAdapter } from '../../../src/utils/asset-management-api-adapter';

import type { AssetManagementAPIConfig } from '../../../src/types/asset-management-api';

describe('AssetManagementAdapter', () => {
  const baseConfig: AssetManagementAPIConfig = {
    baseURL: 'https://am.example.com',
    headers: { organization_uid: 'org-1' },
  };

  let headersStub: sinon.SinonStub;
  let baseUrlStub: sinon.SinonStub;
  let getStub: sinon.SinonStub;

  beforeEach(() => {
    headersStub = sinon.stub(HttpClient.prototype, 'headers').returnsThis();
    baseUrlStub = sinon.stub(HttpClient.prototype, 'baseUrl').returnsThis();
    getStub = sinon.stub(HttpClient.prototype, 'get');
    sinon.stub(authenticationHandler, 'getAuthDetails').resolves();
    sinon.stub(authenticationHandler, 'isOauthEnabled').get(() => false);
    sinon.stub(authenticationHandler, 'accessToken').get(() => 'test-token-123');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should set the baseURL with trailing slash stripped', () => {
      new AssetManagementAdapter({ baseURL: 'https://am.example.com/' });
      expect(baseUrlStub.firstCall.args[0]).to.equal('https://am.example.com');
    });

    it('should set default headers with x-cs-api-version when no extra headers provided', () => {
      new AssetManagementAdapter({ baseURL: 'https://am.example.com' });
      const allHeaderArgs = headersStub.getCalls().map((c) => c.args[0]);
      const apiVersionCall = allHeaderArgs.find((h) => 'x-cs-api-version' in h);
      expect(apiVersionCall).to.exist;
      expect(apiVersionCall['x-cs-api-version']).to.equal('4');
      expect(apiVersionCall['Accept']).to.equal('application/json');
    });

    it('should merge extra headers with default headers', () => {
      new AssetManagementAdapter(baseConfig);
      const allHeaderArgs = headersStub.getCalls().map((c) => c.args[0]);
      const apiVersionCall = allHeaderArgs.find((h) => 'x-cs-api-version' in h);
      expect(apiVersionCall).to.exist;
      expect(apiVersionCall['x-cs-api-version']).to.equal('4');
      expect(apiVersionCall['organization_uid']).to.equal('org-1');
    });

    it('should handle empty baseURL gracefully', () => {
      new AssetManagementAdapter({ baseURL: '' });
      expect(baseUrlStub.firstCall.args[0]).to.equal('');
    });
  });

  describe('init', () => {
    it('should set access_token header when OAuth is disabled', async () => {
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.init();

      const authCallArgs = headersStub.getCalls().map((c) => c.args[0]);
      const authCall = authCallArgs.find((a) => 'access_token' in a);
      expect(authCall).to.exist;
      expect(authCall.access_token).to.equal('test-token-123');
    });

    describe('when OAuth is enabled', () => {
      beforeEach(() => {
        sinon.restore();
        sinon.stub(HttpClient.prototype, 'headers').returnsThis();
        sinon.stub(HttpClient.prototype, 'baseUrl').returnsThis();
        sinon.stub(HttpClient.prototype, 'get');
        sinon.stub(authenticationHandler, 'getAuthDetails').resolves();
        sinon.stub(authenticationHandler, 'isOauthEnabled').get(() => true);
        sinon.stub(authenticationHandler, 'accessToken').get(() => 'oauth-bearer-token');
      });

      it('should set authorization header', async () => {
        const capturedHeaders = HttpClient.prototype.headers as sinon.SinonStub;
        const adapter = new AssetManagementAdapter(baseConfig);
        await adapter.init();

        const authCallArgs = capturedHeaders.getCalls().map((c) => c.args[0]);
        const authCall = authCallArgs.find((a: any) => 'authorization' in a);
        expect(authCall).to.exist;
        expect(authCall.authorization).to.equal('oauth-bearer-token');
      });
    });

    it('should re-throw errors from getAuthDetails', async () => {
      (authenticationHandler.getAuthDetails as sinon.SinonStub).rejects(new Error('auth-failed'));
      const adapter = new AssetManagementAdapter(baseConfig);

      try {
        await adapter.init();
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('auth-failed');
      }
    });

    it('should merge config headers with auth header when config.headers is present', async () => {
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.init();

      const capturedHeaders = headersStub.getCalls().map((c) => c.args[0]);
      const authCall = capturedHeaders.find((a) => 'access_token' in a);
      expect(authCall).to.include({ organization_uid: 'org-1' });
    });
  });

  describe('getSpace', () => {
    it('should GET /api/spaces/{spaceUid}?addl_fields=... and return the space', async () => {
      getStub.resolves({ status: 200, data: { space: { uid: 'sp-1' } } });
      const adapter = new AssetManagementAdapter(baseConfig);
      const result = await adapter.getSpace('sp-1');

      const path = getStub.firstCall.args[0] as string;
      expect(path).to.include('/api/spaces/sp-1');
      expect(path).to.include('addl_fields');
      expect(result).to.deep.equal({ space: { uid: 'sp-1' } });
    });

    it('should throw when response status is non-2xx', async () => {
      getStub.resolves({ status: 404, data: null });
      const adapter = new AssetManagementAdapter(baseConfig);

      try {
        await adapter.getSpace('missing-space');
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err.message).to.include('404');
      }
    });
  });

  describe('getWorkspaceFields', () => {
    it('should GET /api/fields and return the response data', async () => {
      const fieldsResponse = { count: 1, relation: 'org', fields: [{ uid: 'f1' }] };
      getStub.resolves({ status: 200, data: fieldsResponse });
      const adapter = new AssetManagementAdapter(baseConfig);
      const result = await adapter.getWorkspaceFields('sp-1');

      expect(getStub.firstCall.args[0]).to.equal('/api/fields');
      expect(result).to.deep.equal(fieldsResponse);
    });
  });

  describe('getWorkspaceAssets', () => {
    it('should GET /api/spaces/{spaceUid}/assets', async () => {
      getStub.resolves({ status: 200, data: { items: [] } });
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.getWorkspaceAssets('sp-1');

      expect(getStub.firstCall.args[0]).to.include('/api/spaces/sp-1/assets');
    });

    it('should URL-encode the spaceUid in the path', async () => {
      getStub.resolves({ status: 200, data: { items: [] } });
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.getWorkspaceAssets('sp uid/special');

      const path = getStub.firstCall.args[0] as string;
      expect(path).to.include('sp%20uid%2Fspecial');
    });
  });

  describe('getWorkspaceFolders', () => {
    it('should GET /api/spaces/{spaceUid}/folders', async () => {
      getStub.resolves({ status: 200, data: [] });
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.getWorkspaceFolders('sp-1');

      expect(getStub.firstCall.args[0]).to.include('/api/spaces/sp-1/folders');
    });
  });

  describe('getWorkspaceAssetTypes', () => {
    it('should GET /api/asset_types?include_fields=true and return the response data', async () => {
      const atResponse = { count: 1, relation: 'org', asset_types: [{ uid: 'at1' }] };
      getStub.resolves({ status: 200, data: atResponse });
      const adapter = new AssetManagementAdapter(baseConfig);
      const result = await adapter.getWorkspaceAssetTypes('sp-1');

      const path = getStub.firstCall.args[0] as string;
      expect(path).to.include('/api/asset_types');
      expect(path).to.include('include_fields=true');
      expect(result).to.deep.equal(atResponse);
    });
  });

  describe('buildQueryString (via public methods)', () => {
    it('should encode array values as repeated key=value pairs', async () => {
      getStub.resolves({ status: 200, data: { space: { uid: 'sp-1' } } });
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.getSpace('sp-1');

      const path = getStub.firstCall.args[0] as string;
      expect(path).to.include('addl_fields=meta_info');
      expect(path).to.include('addl_fields=users');
    });

    it('should return empty string and no "?" when params are empty', async () => {
      getStub.resolves({ status: 200, data: { count: 0, relation: '', fields: [] } });
      const adapter = new AssetManagementAdapter(baseConfig);
      await adapter.getWorkspaceFields('sp-1');

      const path = getStub.firstCall.args[0] as string;
      expect(path).to.equal('/api/fields');
      expect(path).to.not.include('?');
    });
  });
});
