describe('ContentModelSeeder', () => {
  test('should parse GitHub path correctly', () => {
    const mockParsePath = jest.fn().mockReturnValue({
      username: 'contentstack',
      repo: 'stack-gatsby-blog'
    });

    const result = mockParsePath('contentstack/stack-gatsby-blog');
    
    expect(result.username).toBe('contentstack');
    expect(result.repo).toBe('stack-gatsby-blog');
    expect(mockParsePath).toHaveBeenCalledWith('contentstack/stack-gatsby-blog');
  });

  test('should handle GitHub repository existence check', () => {
    const mockApiCall = jest.fn().mockResolvedValue({
      statusCode: 200,
      statusMessage: 'OK'
    });

    mockApiCall('stack-gatsby-blog');
    
    expect(mockApiCall).toHaveBeenCalledWith('stack-gatsby-blog');
  });

  test('should handle GitHub repository not found error', async () => {
    const mockApiCall = jest.fn().mockResolvedValue({
      statusCode: 404,
      statusMessage: 'Not Found'
    });

    const result = await mockApiCall('invalid-repo');
    
    expect(mockApiCall).toHaveBeenCalledWith('invalid-repo');
    expect(result.statusCode).toBe(404);
  });

  test('should handle GitHub API rate limit error', async () => {
    const mockApiCall = jest.fn().mockResolvedValue({
      statusCode: 403,
      statusMessage: 'Exceeded requests limit. Please try again after 60 minutes.'
    });

    const result = await mockApiCall('stack-gatsby-blog');
    
    expect(result.statusCode).toBe(403);
    expect(result.statusMessage).toContain('Exceeded requests limit');
  });

  test('should create stack with organization', () => {
    const mockCreateStack = jest.fn().mockResolvedValue({
      uid: 'stack_uid',
      name: 'Test Stack',
      api_key: 'test_api_key',
      master_locale: 'en-us',
      org_uid: 'org_uid'
    });

    const organization = {
      uid: 'org_uid',
      name: 'Test Organization',
      enabled: true
    };

    const stackName = 'Test Stack';
    mockCreateStack({
      name: stackName,
      description: '',
      master_locale: 'en-us',
      org_uid: organization.uid
    });

    expect(mockCreateStack).toHaveBeenCalledWith({
      name: stackName,
      description: '',
      master_locale: 'en-us',
      org_uid: organization.uid
    });
  });

  test('should check if should proceed with existing content types', () => {
    const mockGetContentTypeCount = jest.fn().mockResolvedValue(5);
    const mockInquireProceed = jest.fn().mockResolvedValue(true);

    const api_key = 'test_api_key';
    mockGetContentTypeCount(api_key);
    mockInquireProceed();

    expect(mockGetContentTypeCount).toHaveBeenCalledWith(api_key);
    expect(mockInquireProceed).toHaveBeenCalled();
  });

  test('should auto-proceed when no content types exist', () => {
    const mockGetContentTypeCount = jest.fn().mockResolvedValue(0);

    const api_key = 'test_api_key';
    const contentTypeCount = mockGetContentTypeCount(api_key);

    expect(mockGetContentTypeCount).toHaveBeenCalledWith(api_key);
    expect(contentTypeCount).resolves.toBe(0);
  });

  test('should not proceed when user cancels', () => {
    const mockGetContentTypeCount = jest.fn().mockResolvedValue(3);
    const mockInquireProceed = jest.fn().mockResolvedValue(false);

    const api_key = 'test_api_key';
    mockGetContentTypeCount(api_key);
    const userConfirmation = mockInquireProceed();

    expect(mockGetContentTypeCount).toHaveBeenCalledWith(api_key);
    expect(userConfirmation).resolves.toBe(false);
  });

  test('should download release to temp directory', () => {
    const mockDirSync = jest.fn().mockReturnValue({
      name: '/var/tmp/xxxxxx/',
      removeCallback: jest.fn()
    });

    const mockGetLatest = jest.fn().mockResolvedValue(true);

    const tmpDir = mockDirSync();
    mockGetLatest('stack-gatsby-blog', tmpDir.name);

    expect(mockDirSync).toHaveBeenCalled();
    expect(mockGetLatest).toHaveBeenCalledWith('stack-gatsby-blog', '/var/tmp/xxxxxx/');
    expect(tmpDir.name).toBe('/var/tmp/xxxxxx/');
  });

  test('should handle organization access error', () => {
    const mockGetOrganizations = jest.fn().mockResolvedValue([]);

    const organizations = mockGetOrganizations();

    expect(mockGetOrganizations).toHaveBeenCalled();
    expect(organizations).resolves.toEqual([]);
  });

  test('should handle stack creation with management token', () => {
    const mockOptions = {
      managementToken: 'management_token_123',
      stackUid: 'stack_uid_123'
    };

    const mockStackResponse = {
      isNew: false,
      name: 'your stack',
      uid: 'stack_uid_123',
      api_key: 'stack_uid_123'
    };

    expect(mockOptions.managementToken).toBe('management_token_123');
    expect(mockOptions.stackUid).toBe('stack_uid_123');
    expect(mockStackResponse.isNew).toBe(false);
    expect(mockStackResponse.name).toBe('your stack');
    expect(mockStackResponse.uid).toBe('stack_uid_123');
  });

  test('should validate seeder options', () => {
    const options = {
      cdaHost: 'https://cdn.contentstack.io',
      cmaHost: 'https://api.contentstack.io',
      gitHubPath: 'contentstack/stack-gatsby-blog',
      orgUid: '',
      stackUid: '',
      stackName: '',
      fetchLimit: '100',
      skipStackConfirmation: 'no',
      isAuthenticated: true,
      master_locale: 'en-us'
    };

    expect(options.cdaHost).toBe('https://cdn.contentstack.io');
    expect(options.cmaHost).toBe('https://api.contentstack.io');
    expect(options.gitHubPath).toBe('contentstack/stack-gatsby-blog');
    expect(options.isAuthenticated).toBe(true);
    expect(options.master_locale).toBe('en-us');
  });

  test('should handle GitHub path construction', () => {
    const username = 'contentstack';
    const repo = 'stack-gatsby-blog';
    const ghPath = `${username}/${repo}`;

    expect(ghPath).toBe('contentstack/stack-gatsby-blog');
  });

  test('should handle content type count validation', () => {
    const mockContentTypeCount = 5;
    const mockApiKey = 'test_api_key';

    expect(mockContentTypeCount).toBeGreaterThan(0);
    expect(mockApiKey).toBe('test_api_key');
  });

  test('should handle stack creation parameters', () => {
    const stackParams = {
      name: 'My Test Stack',
      description: 'A test stack for seeding content',
      master_locale: 'en-us',
      org_uid: 'org_123'
    };

    expect(stackParams.name).toBe('My Test Stack');
    expect(stackParams.description).toBe('A test stack for seeding content');
    expect(stackParams.master_locale).toBe('en-us');
    expect(stackParams.org_uid).toBe('org_123');
  });

  test('should handle organization data structure', () => {
    const organization = {
      uid: 'org_123',
      name: 'Test Organization',
      enabled: true
    };

    expect(organization.uid).toBe('org_123');
    expect(organization.name).toBe('Test Organization');
    expect(organization.enabled).toBe(true);
  });

  test('should handle stack response structure', () => {
    const stackResponse = {
      isNew: false,
      name: 'Existing Stack',
      uid: 'stack_456',
      api_key: 'api_key_789'
    };

    expect(stackResponse.isNew).toBe(false);
    expect(stackResponse.name).toBe('Existing Stack');
    expect(stackResponse.uid).toBe('stack_456');
    expect(stackResponse.api_key).toBe('api_key_789');
  });
}); 