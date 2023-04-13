const mockData = {
  flags: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: 'sfgfdsg223',
    module: 'content_types',
    authToken: 'sqerqw2454',
    format: 'text',
  },
  data: {
    base: 'main',
    compare: 'dev',
    base_only: 0,
    compare_only: 0,
    modified: 0,
  },
  branchDiff: {
    branches: {
      base_branch: 'main',
      compare_branch: 'dev',
    },
    diff: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_type',
        status: 'compare_only',
      },
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_type',
        status: 'modified',
      },
    ],
  },
  branchSummary: {
    baseCount: 0,
    compareCount: 1,
    modifiedCount: 1,
  },
  branchCompactData: {
    listOfModified: [
      {
        uid: 'content_type1',
        title: 'Content Type1',
        type: 'content_type',
        status: 'modified',
      },
    ],
    listOfAdded: [
      {
        uid: 'content_type2',
        title: 'Content Type 2',
        type: 'content_type',
        status: 'compare_only',
      },
    ],
    listOfDeleted: [
      {
        uid: 'content_type3',
        title: 'Content Type 3',
        type: 'content_type',
        status: 'base_only',
      },
    ],
  },
};

const createBranchMockData = {
  flags: {
    source: 'main',
    uid: 'new_branch',
    apiKey: 'abcd',
  },
};

const deleteBranchMockData = {
  flags: {
    uid: 'new_branch',
    apiKey: 'abcd',
    force: false,
    confirm: false,
  },
};

const branchMockData = {
  flags: {
    apiKey: 'abcd',
    verbose: true,
  },
  data: {
    items: [
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/naya_branch',
        uid: 'naya_branch',
        source: 'main',
        created_by: 'blt55927d24ccc8d74e',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2023-03-02T12:53:18.809Z',
        updated_at: '2023-03-02T12:53:19.208Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/bextension',
        uid: 'bextension',
        source: 'main',
        created_by: 'blt55927d24ccc8d74e',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2023-03-01T09:36:18.174Z',
        updated_at: '2023-03-01T09:36:18.538Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/gaurav',
        uid: 'gaurav',
        source: 'main',
        created_by: 'bltef4c4a703ce62f56',
        updated_by: 'bltef4c4a703ce62f56',
        created_at: '2023-01-11T08:55:51.556Z',
        updated_at: '2023-01-11T08:55:51.869Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/mai_copy',
        uid: 'mai_copy',
        source: 'main',
        created_by: 'blt55927d24ccc8d74e',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2022-11-25T10:58:41.816Z',
        updated_at: '2022-11-25T10:58:42.209Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/develop',
        uid: 'develop',
        source: 'main',
        created_by: 'bltef4c4a703ce62f56',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2022-10-30T18:35:01.639Z',
        updated_at: '2022-11-18T09:54:41.678Z',
        deleted_at: false,
        alias: [
          {
            uid: 'alias2',
          },
        ],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/main',
        uid: 'main',
        source: '',
        created_by: 'blt099091e0593b9188',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2022-09-27T06:11:29.016Z',
        updated_at: '2022-11-18T09:54:41.671Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'blt172b012fc9475f5c',
        },
        urlPath: '/stacks/branches/release',
        uid: 'release',
        source: 'develop',
        created_by: 'bltef4c4a703ce62f56',
        updated_by: 'blt55927d24ccc8d74e',
        created_at: '2022-10-30T18:37:05.875Z',
        updated_at: '2022-11-18T09:42:22.266Z',
        deleted_at: false,
        alias: [
          {
            uid: 'alias1',
          },
        ],
      },
    ],
  },
};

export { mockData, createBranchMockData, deleteBranchMockData, branchMockData };
