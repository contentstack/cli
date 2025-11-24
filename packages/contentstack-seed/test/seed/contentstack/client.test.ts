// Mock utilities before importing anything that uses them
jest.mock('@contentstack/cli-utilities', () => {
  const actual = jest.requireActual('@contentstack/cli-utilities');
  return {
    ...actual,
    configHandler: {
      get: jest.fn().mockReturnValue(null),
    },
    managementSDKClient: jest.fn(),
  };
});

// Mock dependencies
jest.mock('@contentstack/management');

import ContentstackClient from '../../../src/seed/contentstack/client';
import ContentstackError from '../../../src/seed/contentstack/error';
import { managementSDKClient, configHandler } from '@contentstack/cli-utilities';
import * as ContentstackManagementSDK from '@contentstack/management';

describe('ContentstackClient', () => {
  let mockClient: any;
  let contentstackClient: ContentstackClient;
  const cmaHost = 'https://api.contentstack.io';
  const limit = 100;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock management SDK client
    mockClient = {
      organization: jest.fn(),
      stack: jest.fn(),
    };

    (managementSDKClient as jest.Mock) = jest.fn().mockResolvedValue(mockClient);
    (configHandler.get as jest.Mock) = jest.fn().mockReturnValue(null);

    contentstackClient = new ContentstackClient(cmaHost, limit);
  });

  describe('constructor', () => {
    it('should initialize with cmaHost and limit', () => {
      const client = new ContentstackClient(cmaHost, limit);
      expect(client.limit).toBe(limit);
      expect(managementSDKClient).toHaveBeenCalledWith({ host: cmaHost });
    });

    it('should use provided limit', () => {
      const client = new ContentstackClient(cmaHost, 50);
      expect(client.limit).toBe(50);
    });
  });

  describe('getOrganization', () => {
    it('should fetch organization by UID', async () => {
      const orgUid = 'org-123';
      const mockOrg = {
        uid: orgUid,
        name: 'Test Org',
        enabled: true,
      };

      const mockOrgInstance = {
        fetch: jest.fn().mockResolvedValue(mockOrg),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      const result = await contentstackClient.getOrganization(orgUid);

      expect(mockClient.organization).toHaveBeenCalledWith(orgUid);
      expect(mockOrgInstance.fetch).toHaveBeenCalled();
      expect(result).toEqual({
        uid: orgUid,
        name: 'Test Org',
        enabled: true,
      });
    });

    it('should throw ContentstackError on failure', async () => {
      const orgUid = 'org-123';
      const mockError = {
        errorMessage: 'Organization not found',
        status: 404,
      };

      const mockOrgInstance = {
        fetch: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      await expect(contentstackClient.getOrganization(orgUid)).rejects.toThrow(
        ContentstackError,
      );
    });
  });

  describe('getOrganizations', () => {
    it('should fetch all organizations', async () => {
      const mockOrgs = [
        { uid: 'org-1', name: 'Org 1', enabled: true },
        { uid: 'org-2', name: 'Org 2', enabled: true },
      ];

      const mockResponse = {
        items: mockOrgs,
        count: 2,
      };

      const mockOrgInstance = {
        fetchAll: jest.fn().mockResolvedValue(mockResponse),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      const result = await contentstackClient.getOrganizations();

      expect(mockOrgInstance.fetchAll).toHaveBeenCalledWith({
        limit: limit,
        asc: 'name',
        include_count: true,
        skip: 0,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        uid: 'org-1',
        name: 'Org 1',
        enabled: true,
      });
    });

    it('should use oauthOrgUid from config when available', async () => {
      const mockOrg = {
        uid: 'oauth-org-123',
        name: 'OAuth Org',
        enabled: true,
      };

      (configHandler.get as jest.Mock) = jest.fn().mockReturnValue('oauth-org-123');

      const mockOrgInstance = {
        fetch: jest.fn().mockResolvedValue(mockOrg),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      const result = await contentstackClient.getOrganizations();

      expect(mockClient.organization).toHaveBeenCalledWith('oauth-org-123');
      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('oauth-org-123');
    });

    it('should paginate when count exceeds limit', async () => {
      const mockResponse1 = {
        items: Array.from({ length: limit }, (_, i) => ({
          uid: `org-${i}`,
          name: `Org ${i}`,
          enabled: true,
        })),
        count: 150,
      };

      const mockResponse2 = {
        items: Array.from({ length: 50 }, (_, i) => ({
          uid: `org-${limit + i}`,
          name: `Org ${limit + i}`,
          enabled: true,
        })),
        count: 150,
      };

      const mockOrgInstance = {
        fetchAll: jest
          .fn()
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      const result = await contentstackClient.getOrganizations();

      expect(mockOrgInstance.fetchAll).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(150);
    });

    it('should throw ContentstackError on failure', async () => {
      const mockError = {
        errorMessage: 'Unauthorized',
        status: 401,
      };

      const mockOrgInstance = {
        fetchAll: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.organization.mockReturnValue(mockOrgInstance);

      await expect(contentstackClient.getOrganizations()).rejects.toThrow(ContentstackError);
    });
  });

  describe('getStack', () => {
    it('should fetch stack by UID', async () => {
      const stackUid = 'stack-123';
      const mockStack = {
        uid: 'stack-123',
        name: 'Test Stack',
        master_locale: 'en-us',
        api_key: 'api-key-123',
        org_uid: 'org-123',
      };

      const mockStackInstance = {
        fetch: jest.fn().mockResolvedValue(mockStack),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.getStack(stackUid);

      expect(mockClient.stack).toHaveBeenCalledWith({ api_key: stackUid });
      expect(result).toEqual({
        uid: 'stack-123',
        name: 'Test Stack',
        master_locale: 'en-us',
        api_key: 'api-key-123',
        org_uid: 'org-123',
      });
    });

    it('should throw ContentstackError on failure', async () => {
      const stackUid = 'stack-123';
      const mockError = {
        errorMessage: 'Stack not found',
        status: 404,
      };

      const mockStackInstance = {
        fetch: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await expect(contentstackClient.getStack(stackUid)).rejects.toThrow(ContentstackError);
    });
  });

  describe('getStacks', () => {
    it('should fetch all stacks for an organization', async () => {
      const orgUid = 'org-123';
      const mockStacks = [
        {
          uid: 'stack-1',
          name: 'Stack 1',
          master_locale: 'en-us',
          api_key: 'api-key-1',
          org_uid: orgUid,
        },
        {
          uid: 'stack-2',
          name: 'Stack 2',
          master_locale: 'en-us',
          api_key: 'api-key-2',
          org_uid: orgUid,
        },
      ];

      const mockResponse = {
        items: mockStacks,
        count: 2,
      };

      const mockQueryInstance = {
        find: jest.fn().mockResolvedValue(mockResponse),
      };

      const mockStackInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.getStacks(orgUid);

      expect(mockClient.stack).toHaveBeenCalledWith({ organization_uid: orgUid });
      expect(mockStackInstance.query).toHaveBeenCalledWith({
        limit: limit,
        include_count: true,
        skip: 0,
        query: {},
      });
      expect(result).toHaveLength(2);
    });

    it('should paginate when count exceeds limit', async () => {
      const orgUid = 'org-123';
      const mockResponse1 = {
        items: Array.from({ length: limit }, (_, i) => ({
          uid: `stack-${i}`,
          name: `Stack ${i}`,
          master_locale: 'en-us',
          api_key: `api-key-${i}`,
          org_uid: orgUid,
        })),
        count: 150,
      };

      const mockResponse2 = {
        items: Array.from({ length: 50 }, (_, i) => ({
          uid: `stack-${limit + i}`,
          name: `Stack ${limit + i}`,
          master_locale: 'en-us',
          api_key: `api-key-${limit + i}`,
          org_uid: orgUid,
        })),
        count: 150,
      };

      const mockQueryInstance = {
        find: jest
          .fn()
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2),
      };

      const mockStackInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.getStacks(orgUid);

      expect(result).toHaveLength(150);
    });

    it('should throw ContentstackError on failure', async () => {
      const orgUid = 'org-123';
      const mockError = {
        errorMessage: 'Unauthorized',
        status: 401,
      };

      const mockQueryInstance = {
        find: jest.fn().mockRejectedValue(mockError),
      };

      const mockStackInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await expect(contentstackClient.getStacks(orgUid)).rejects.toThrow(ContentstackError);
    });
  });

  describe('getContentTypeCount', () => {
    it('should get content type count for a stack', async () => {
      const apiKey = 'api-key-123';
      const mockResponse = {
        count: 5,
      };

      const mockQueryInstance = {
        find: jest.fn().mockResolvedValue(mockResponse),
      };

      const mockContentTypeInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      const mockStackInstance = {
        contentType: jest.fn().mockReturnValue(mockContentTypeInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.getContentTypeCount(apiKey);

      expect(mockClient.stack).toHaveBeenCalledWith({ api_key: apiKey });
      expect(mockContentTypeInstance.query).toHaveBeenCalledWith({ include_count: true });
      expect(result).toBe(5);
    });

    it('should use management token when provided', async () => {
      const apiKey = 'api-key-123';
      const managementToken = 'token-123';
      const mockResponse = { count: 3 };

      const mockQueryInstance = {
        find: jest.fn().mockResolvedValue(mockResponse),
      };

      const mockContentTypeInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      const mockStackInstance = {
        contentType: jest.fn().mockReturnValue(mockContentTypeInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await contentstackClient.getContentTypeCount(apiKey, managementToken);

      expect(mockClient.stack).toHaveBeenCalledWith({
        api_key: apiKey,
        management_token: managementToken,
      });
    });

    it('should throw ContentstackError on failure', async () => {
      const apiKey = 'api-key-123';
      const mockError = {
        errorMessage: 'Unauthorized',
        status: 401,
      };

      const mockQueryInstance = {
        find: jest.fn().mockRejectedValue(mockError),
      };

      const mockContentTypeInstance = {
        query: jest.fn().mockReturnValue(mockQueryInstance),
      };

      const mockStackInstance = {
        contentType: jest.fn().mockReturnValue(mockContentTypeInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await expect(contentstackClient.getContentTypeCount(apiKey)).rejects.toThrow(
        ContentstackError,
      );
    });
  });

  describe('createStack', () => {
    it('should create a new stack', async () => {
      const options = {
        name: 'New Stack',
        description: 'Test description',
        master_locale: 'en-us',
        org_uid: 'org-123',
      };

      const mockStack = {
        uid: 'stack-123',
        api_key: 'api-key-123',
        master_locale: 'en-us',
        name: 'New Stack',
        org_uid: 'org-123',
      };

      const mockStackInstance = {
        create: jest.fn().mockResolvedValue(mockStack),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.createStack(options);

      expect(mockStackInstance.create).toHaveBeenCalledWith(
        {
          stack: {
            name: options.name,
            description: options.description,
            master_locale: options.master_locale,
          },
        },
        { organization_uid: options.org_uid },
      );
      expect(result).toEqual(mockStack);
    });

    it('should throw ContentstackError on failure', async () => {
      const options = {
        name: 'New Stack',
        description: 'Test description',
        master_locale: 'en-us',
        org_uid: 'org-123',
      };

      const mockError = {
        errorMessage: 'Stack creation failed',
        status: 400,
      };

      const mockStackInstance = {
        create: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await expect(contentstackClient.createStack(options)).rejects.toThrow(ContentstackError);
    });
  });

  describe('createManagementToken', () => {
    it('should create management token successfully', async () => {
      const apiKey = 'api-key-123';
      const managementToken = 'existing-token';
      const options = {
        name: 'Test Token',
        description: 'Test description',
        expires_on: '3000-01-01',
        scope: [
          {
            module: 'content_type',
            acl: { read: true, write: true },
          },
        ],
      };

      const mockResponse = {
        errorCode: undefined,
        errorMessage: undefined,
      };

      const mockTokenInstance = {
        create: jest.fn().mockResolvedValue(mockResponse),
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockTokenInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.createManagementToken(
        apiKey,
        managementToken,
        options,
      );

      expect(mockClient.stack).toHaveBeenCalledWith({
        api_key: apiKey,
        management_token: managementToken,
      });
      expect(mockTokenInstance.create).toHaveBeenCalledWith({
        token: {
          name: options.name,
          description: options.description,
          scope: options.scope,
          expires_on: options.expires_on,
        },
      });
      expect(result.response_code).toBeUndefined();
    });

    it('should handle error code 401', async () => {
      const apiKey = 'api-key-123';
      const managementToken = 'existing-token';
      const options = {
        name: 'Test Token',
        description: 'Test description',
        expires_on: '3000-01-01',
        scope: [],
      };

      const mockError = {
        errorCode: '401',
      };

      const mockTokenInstance = {
        create: jest.fn().mockRejectedValue(mockError),
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockTokenInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      const result = await contentstackClient.createManagementToken(
        apiKey,
        managementToken,
        options,
      );

      expect(result.response_code).toBe('401');
      expect(result.response_message).toContain('do not have access');
    });

    it('should throw ContentstackError on other errors', async () => {
      const apiKey = 'api-key-123';
      const managementToken = 'existing-token';
      const options = {
        name: 'Test Token',
        description: 'Test description',
        expires_on: '3000-01-01',
        scope: [],
      };

      const mockError = {
        errorCode: '500',
        errorMessage: 'Internal server error',
        status: 500,
      };

      const mockTokenInstance = {
        create: jest.fn().mockRejectedValue(mockError),
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockTokenInstance),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      await expect(
        contentstackClient.createManagementToken(apiKey, managementToken, options),
      ).rejects.toThrow(ContentstackError);
    });
  });

  describe('buildError', () => {
    it('should build error from errorMessage', () => {
      const mockError = {
        errorMessage: 'Test error',
        status: 400,
      };

      // Access private method through getStack which uses buildError
      const mockStackInstance = {
        fetch: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      return expect(contentstackClient.getStack('stack-123')).rejects.toThrow('Test error');
    });

    it('should build error from response.data.errorMessage', () => {
      const mockError = {
        response: {
          data: {
            errorMessage: 'Response error',
          },
        },
        status: 404,
      };

      const mockStackInstance = {
        fetch: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      return expect(contentstackClient.getStack('stack-123')).rejects.toThrow('Response error');
    });

    it('should build error from response.statusText', () => {
      const mockError = {
        response: {
          statusText: 'Not Found',
        },
        status: 404,
      };

      const mockStackInstance = {
        fetch: jest.fn().mockRejectedValue(mockError),
      };

      mockClient.stack.mockReturnValue(mockStackInstance);

      return expect(contentstackClient.getStack('stack-123')).rejects.toThrow('Not Found');
    });
  });
});
