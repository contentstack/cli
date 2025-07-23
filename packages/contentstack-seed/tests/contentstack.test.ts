import ContentstackClient, { CreateStackOptions, createManagementTokenOptions } from '../src/seed/contentstack/client';
import ContentstackError from '../src/seed/contentstack/error';

// Mock the management SDK client
jest.mock('@contentstack/cli-utilities', () => ({
  managementSDKClient: jest.fn(),
  configHandler: {
    get: jest.fn()
  }
}));

describe('ContentstackClient', () => {
  let client: ContentstackClient;
  let mockManagementClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock management client
    mockManagementClient = {
      organization: jest.fn(),
      stack: jest.fn()
    };

    // Mock the managementSDKClient to return our mock client
    const { managementSDKClient } = require('@contentstack/cli-utilities');
    managementSDKClient.mockResolvedValue(mockManagementClient);

    client = new ContentstackClient('https://api.contentstack.io', 100);
  });

  describe('constructor', () => {
    test('should initialize with correct parameters', () => {
      expect(client.limit).toBe(100);
    });

    test('should use default limit when not provided', () => {
      const clientWithDefaultLimit = new ContentstackClient('https://api.contentstack.io', 0);
      expect(clientWithDefaultLimit.limit).toBe(100);
    });
  });

  describe('getOrganization', () => {
    test('should fetch organization successfully', async () => {
      const mockOrg = {
        uid: 'org_123',
        name: 'Test Organization',
        enabled: true
      };

      const mockOrgInstance = {
        fetch: jest.fn().mockResolvedValue(mockOrg)
      };

      mockManagementClient.organization.mockReturnValue(mockOrgInstance);

      const result = await client.getOrganization('org_123');

      expect(result).toEqual({
        uid: 'org_123',
        name: 'Test Organization',
        enabled: true
      });
      expect(mockManagementClient.organization).toHaveBeenCalledWith('org_123');
      expect(mockOrgInstance.fetch).toHaveBeenCalled();
    });

    test('should throw ContentstackError when organization fetch fails', async () => {
      const error = {
        errorMessage: 'Organization not found',
        status: 404
      };
      const mockOrgInstance = {
        fetch: jest.fn().mockRejectedValue(error)
      };

      mockManagementClient.organization.mockReturnValue(mockOrgInstance);

      await expect(client.getOrganization('invalid_org')).rejects.toThrow(ContentstackError);
    });
  });

  describe('getOrganizations', () => {
    test('should fetch organizations with config org UID', async () => {
      const { configHandler } = require('@contentstack/cli-utilities');
      configHandler.get.mockReturnValue('org_123');

      const mockOrg = {
        uid: 'org_123',
        name: 'Test Organization',
        enabled: true
      };

      const mockOrgInstance = {
        fetch: jest.fn().mockResolvedValue(mockOrg)
      };

      mockManagementClient.organization.mockReturnValue(mockOrgInstance);

      const result = await client.getOrganizations();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uid: 'org_123',
        name: 'Test Organization',
        enabled: true
      });
      expect(configHandler.get).toHaveBeenCalledWith('oauthOrgUid');
    });

    test('should fetch all organizations when no config org UID', async () => {
      const { configHandler } = require('@contentstack/cli-utilities');
      configHandler.get.mockReturnValue(null);

      const mockResponse = {
        items: [
          { uid: 'org_1', name: 'Org 1', enabled: true },
          { uid: 'org_2', name: 'Org 2', enabled: false }
        ],
        count: 2
      };

      const mockOrgInstance = {
        fetchAll: jest.fn().mockResolvedValue(mockResponse)
      };

      mockManagementClient.organization.mockReturnValue(mockOrgInstance);

      const result = await client.getOrganizations();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        uid: 'org_1',
        name: 'Org 1',
        enabled: true
      });
      expect(result[1]).toEqual({
        uid: 'org_2',
        name: 'Org 2',
        enabled: false
      });
    });

    test('should handle pagination for organizations', async () => {
      const { configHandler } = require('@contentstack/cli-utilities');
      configHandler.get.mockReturnValue(null);

      const mockResponse = {
        items: [{ uid: 'org_1', name: 'Org 1', enabled: true }],
        count: 150
      };

      const mockOrgInstance = {
        fetchAll: jest.fn().mockResolvedValue(mockResponse)
      };

      mockManagementClient.organization.mockReturnValue(mockOrgInstance);

      await client.getOrganizations();

      expect(mockOrgInstance.fetchAll).toHaveBeenCalledWith({
        limit: 100,
        asc: 'name',
        include_count: true,
        skip: 0
      });
    });
  });

  describe('getStack', () => {
    test('should fetch stack successfully', async () => {
      const mockStack = {
        uid: 'stack_123',
        name: 'Test Stack',
        master_locale: 'en-us',
        api_key: 'api_key_123',
        org_uid: 'org_123'
      };

      const mockStackInstance = {
        fetch: jest.fn().mockResolvedValue(mockStack)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.getStack('stack_123');

      expect(result).toEqual({
        uid: 'stack_123',
        name: 'Test Stack',
        master_locale: 'en-us',
        api_key: 'api_key_123',
        org_uid: 'org_123'
      });
      expect(mockManagementClient.stack).toHaveBeenCalledWith({ api_key: 'stack_123' });
    });

    test('should throw ContentstackError when stack fetch fails', async () => {
      const error = {
        errorMessage: 'Stack not found',
        status: 404
      };
      const mockStackInstance = {
        fetch: jest.fn().mockRejectedValue(error)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      await expect(client.getStack('invalid_stack')).rejects.toThrow(ContentstackError);
    });
  });

  describe('getStacks', () => {
    test('should fetch stacks for organization', async () => {
      const mockResponse = {
        items: [
          {
            uid: 'stack_1',
            name: 'Stack 1',
            master_locale: 'en-us',
            api_key: 'api_key_1',
            org_uid: 'org_123'
          },
          {
            uid: 'stack_2',
            name: 'Stack 2',
            master_locale: 'en-us',
            api_key: 'api_key_2',
            org_uid: 'org_123'
          }
        ],
        count: 2
      };

      const mockStackInstance = {
        query: jest.fn().mockReturnThis(),
        find: jest.fn().mockResolvedValue(mockResponse)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.getStacks('org_123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        uid: 'stack_1',
        name: 'Stack 1',
        master_locale: 'en-us',
        api_key: 'api_key_1',
        org_uid: 'org_123'
      });
      expect(mockManagementClient.stack).toHaveBeenCalledWith({ organization_uid: 'org_123' });
    });

    test('should handle pagination for stacks', async () => {
      const mockResponse = {
        items: [{ uid: 'stack_1', name: 'Stack 1', master_locale: 'en-us', api_key: 'api_key_1', org_uid: 'org_123' }],
        count: 150
      };

      const mockStackInstance = {
        query: jest.fn().mockReturnThis(),
        find: jest.fn().mockResolvedValue(mockResponse)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      await client.getStacks('org_123');

      expect(mockStackInstance.query).toHaveBeenCalledWith({
        limit: 100,
        include_count: true,
        skip: 0,
        query: {}
      });
    });
  });

  describe('getContentTypeCount', () => {
    test('should get content type count successfully', async () => {
      const mockResponse = { count: 5 };
      const mockContentTypeInstance = {
        query: jest.fn().mockReturnThis(),
        find: jest.fn().mockResolvedValue(mockResponse)
      };

      const mockStackInstance = {
        contentType: jest.fn().mockReturnValue(mockContentTypeInstance)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.getContentTypeCount('api_key_123');

      expect(result).toBe(5);
      expect(mockManagementClient.stack).toHaveBeenCalledWith({ api_key: 'api_key_123' });
    });

    test('should get content type count with management token', async () => {
      const mockResponse = { count: 3 };
      const mockContentTypeInstance = {
        query: jest.fn().mockReturnThis(),
        find: jest.fn().mockResolvedValue(mockResponse)
      };

      const mockStackInstance = {
        contentType: jest.fn().mockReturnValue(mockContentTypeInstance)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.getContentTypeCount('api_key_123', 'management_token_123');

      expect(result).toBe(3);
      expect(mockManagementClient.stack).toHaveBeenCalledWith({
        api_key: 'api_key_123',
        management_token: 'management_token_123'
      });
    });
  });

  describe('createStack', () => {
    test('should create stack successfully', async () => {
      const createOptions: CreateStackOptions = {
        name: 'New Stack',
        description: 'Test stack description',
        master_locale: 'en-us',
        org_uid: 'org_123'
      };

      const mockCreatedStack = {
        uid: 'stack_123',
        api_key: 'api_key_123',
        master_locale: 'en-us',
        name: 'New Stack',
        org_uid: 'org_123'
      };

      const mockStackInstance = {
        create: jest.fn().mockResolvedValue(mockCreatedStack)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.createStack(createOptions);

      expect(result).toEqual({
        uid: 'stack_123',
        api_key: 'api_key_123',
        master_locale: 'en-us',
        name: 'New Stack',
        org_uid: 'org_123'
      });
      expect(mockStackInstance.create).toHaveBeenCalledWith(
        {
          stack: {
            name: 'New Stack',
            description: 'Test stack description',
            master_locale: 'en-us'
          }
        },
        { organization_uid: 'org_123' }
      );
    });

    test('should throw ContentstackError when stack creation fails', async () => {
      const createOptions: CreateStackOptions = {
        name: 'New Stack',
        description: 'Test stack description',
        master_locale: 'en-us',
        org_uid: 'org_123'
      };

      const error = {
        errorMessage: 'Stack creation failed',
        status: 400
      };
      const mockStackInstance = {
        create: jest.fn().mockRejectedValue(error)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      await expect(client.createStack(createOptions)).rejects.toThrow(ContentstackError);
    });
  });

  describe('createManagementToken', () => {
    test('should create management token successfully', async () => {
      const tokenOptions: createManagementTokenOptions = {
        name: 'Test Token',
        description: 'Test token description',
        expires_on: '2024-12-31',
        scope: [
          {
            module: 'content_type',
            acl: {
              read: true,
              write: true
            }
          }
        ]
      };

      const mockResponse = {
        errorCode: '200',
        errorMessage: 'Token created successfully'
      };

      const mockManagementTokenInstance = {
        create: jest.fn().mockResolvedValue(mockResponse)
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockManagementTokenInstance)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.createManagementToken('api_key_123', 'management_token_123', tokenOptions);

      expect(result).toEqual({
        response_code: '200',
        response_message: 'Token created successfully'
      });
      expect(mockStackInstance.managementToken).toHaveBeenCalled();
      expect(mockManagementTokenInstance.create).toHaveBeenCalledWith({
        token: {
          name: 'Test Token',
          description: 'Test token description',
          scope: tokenOptions.scope,
          expires_on: '2024-12-31'
        }
      });
    });

    test('should handle 401 error for management token creation', async () => {
      const tokenOptions: createManagementTokenOptions = {
        name: 'Test Token',
        description: 'Test token description',
        expires_on: '2024-12-31',
        scope: [
          {
            module: 'content_type',
            acl: {
              read: true,
              write: true
            }
          }
        ]
      };

      const error = { errorCode: '401' };
      const mockManagementTokenInstance = {
        create: jest.fn().mockRejectedValue(error)
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockManagementTokenInstance)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      const result = await client.createManagementToken('api_key_123', 'management_token_123', tokenOptions);

      expect(result).toEqual({
        response_code: '401',
        response_message: 'You do not have access to create management tokens. Please try again or ask an Administrator for assistance.'
      });
    });

    test('should throw ContentstackError for other errors', async () => {
      const tokenOptions: createManagementTokenOptions = {
        name: 'Test Token',
        description: 'Test token description',
        expires_on: '2024-12-31',
        scope: [
          {
            module: 'content_type',
            acl: {
              read: true,
              write: true
            }
          }
        ]
      };

      const error = { errorCode: '500', errorMessage: 'Internal server error' };
      const mockManagementTokenInstance = {
        create: jest.fn().mockRejectedValue(error)
      };

      const mockStackInstance = {
        managementToken: jest.fn().mockReturnValue(mockManagementTokenInstance)
      };

      mockManagementClient.stack.mockReturnValue(mockStackInstance);

      await expect(client.createManagementToken('api_key_123', 'management_token_123', tokenOptions)).rejects.toThrow(ContentstackError);
    });
  });

  describe('error handling', () => {
    test('should build error with errorMessage', () => {
      const error = {
        errorMessage: 'Custom error message',
        status: 400
      };

      expect(() => {
        throw new ContentstackError(error.errorMessage, error.status);
      }).toThrow('Custom error message');
    });

    test('should build error with response data', () => {
      const error = {
        response: {
          data: {
            errorMessage: 'Response error message'
          },
          statusText: 'Bad Request'
        },
        status: 400
      };

      expect(() => {
        throw new ContentstackError(error.response.data.errorMessage, error.status);
      }).toThrow('Response error message');
    });

    test('should build error with status text', () => {
      const error = {
        response: {
          statusText: 'Not Found'
        },
        status: 404
      };

      expect(() => {
        throw new ContentstackError(error.response.statusText, error.status);
      }).toThrow('Not Found');
    });
  });
});
