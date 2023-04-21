const mockData = {
  flags: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: 'sfgfdsg223',
    module: 'content_types',
    format: 'compactText',
  },
  withoutBaseFlag: {
    compareBranch: 'dev',
    stackAPIKey: 'sfgfdsg223',
    module: 'content_types',
    format: 'compactText',
  },
  withoutCompareFlag: {
    baseBranch: 'main',
    stackAPIKey: 'sfgfdsg223',
    module: 'content_types',
    format: 'compactText',
  },
  withoutAPIKeyFlag: {
    baseBranch: 'main',
    compareBranch: 'dev',
    module: 'content_types',
    format: 'compactText',
  },
  withoutModuleFlag: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: 'sfgfdsg223',
    format: 'compactText',
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
        type: 'content_types',
        status: 'compare_only',
      },
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_types',
        status: 'modified',
      },
    ],
  },
  contentTypesDiff: [
    {
      uid: 'content_type_uid_1',
      title: 'Content Type 1 Title',
      type: 'content_types',
      status: 'compare_only',
    },
    {
      uid: 'content_type_uid_2',
      title: 'Content Type 2 Title',
      type: 'content_types',
      status: 'modified',
    },
  ],
  branchTextData: {
    modified: [
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_types',
        status: 'modified',
      },
    ],
    deleted: [],
    added: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_types',
        status: 'compare_only',
      },
    ],
  },
  globalFieldDiff: [
    {
      uid: 'global_field_uid_1',
      title: 'Global Field 1 Title',
      type: 'global_fields',
      status: 'compare_only',
    },
    {
      uid: 'global_field_uid_2',
      title: 'Global Field 2 Title',
      type: 'global_fields',
      status: 'modified',
    },
  ],
  branchSummary: {
    base: 'main',
    compare: 'dev',
    base_only: 0,
    compare_only: 1,
    modified: 1,
  },
  branchCompactData: {
    modified: [
      {
        uid: 'content_type1',
        title: 'Content Type1',
        type: 'content_types',
        status: 'modified',
      },
    ],
    added: [
      {
        uid: 'content_type2',
        title: 'Content Type 2',
        type: 'content_types',
        status: 'compare_only',
      },
    ],
    deleted: [
      {
        uid: 'content_type3',
        title: 'Content Type 3',
        type: 'content_types',
        status: 'base_only',
      },
    ],
  },
  branchDiffPayload: {
    module: 'content_types',
    apiKey: 'afdgaffsdg',
    baseBranch: 'main',
    compareBranch: 'dev',
  },
  verboseContentTypeRes: {
    modified: [
      {
        moduleDetails: {
          uid: 'content_type_uid_2',
          title: 'Content Type 2 Title',
          type: 'content_types',
          status: 'modified',
        },
        modifiedFields: {
          modified: [
            {
              uid: 'url',
              displayName: 'text1',
              path: 'url',
              fieldType: 'URL field',
            },
          ],
          deleted: [
            {
              uid: 'url1',
              displayName: 'text2',
              path: 'url1',
              fieldType: 'URL field',
            },
          ],
          added: [
            {
              uid: 'url2',
              displayName: 'text3',
              path: 'url2',
              fieldType: 'URL field',
            },
          ],
        },
      },
    ],
    added: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_types',
        status: 'compare_only',
      },
    ],
    deleted: [
      {
        uid: 'content_type_uid_3',
        title: 'Content Type 3 Title',
        type: 'content_types',
        status: 'base_only',
      },
    ],
  },
  noModifiedData: {
    modified: [],
    added: [],
    deleted: [],
  },
  contentTypesDiffData: {
    content_types: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_types',
        status: 'compare_only',
      },
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_types',
        status: 'modified',
      },
    ],
    global_fields:[]
  },
  globalFieldsDiffData: {
    content_types: [],
    global_fields: [
      {
        uid: 'global_field_uid_1',
        title: 'Global Field 1 Title',
        type: 'global_fields',
        status: 'compare_only',
      },
      {
        uid: 'global_field_uid_2',
        title: 'Global Field 2 Title',
        type: 'global_fields',
        status: 'modified',
      },
    ],
  },
  allDiffData: [
    {
      uid: 'global_field_uid_1',
      title: 'Global Field 1 Title',
      type: 'global_fields',
      status: 'compare_only',
    },
    {
      uid: 'global_field_uid_2',
      title: 'Global Field 2 Title',
      type: 'global_fields',
      status: 'modified',
    },
    {
      uid: 'content_type_uid_1',
      title: 'Content Type 1 Title',
      type: 'content_types',
      status: 'compare_only',
    },
    {
      uid: 'content_type_uid_2',
      title: 'Content Type 2 Title',
      type: 'content_types',
      status: 'modified',
    },
  ],
  moduleWiseData: {
    content_types: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_types',
        status: 'compare_only',
      },
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_types',
        status: 'modified',
      },
    ],
    global_fields: [
      {
        uid: 'global_field_uid_1',
        title: 'Global Field 1 Title',
        type: 'global_fields',
        status: 'compare_only',
      },
      {
        uid: 'global_field_uid_2',
        title: 'Global Field 2 Title',
        type: 'global_fields',
        status: 'modified',
      },
    ],
  },
  globalFieldDetailDiff: {
    branches: {
      base_branch: 'main',
      compare_branch: 'dev',
    },
    diff: {
      uid: 'gf1',
      type: 'global_fields',
      status: 'modified',
      base_branch: {
        differences: [
          {
            value: 'gf4',
            path: 'title',
          },
          {
            data_type: 'compactText',
            display_name: 'Single Line Textbox33',
            uid: 'single_line_textbox33',
            field_metadata: {
              description: '',
              default_value: '',
              version: 3,
            },
            format: '',
            error_messages: {
              format: '',
            },
            mandatory: false,
            multiple: false,
            non_localizable: false,
            unique: false,
            indexed: false,
            inbuilt_model: false,
            path: 'schema[3]',
          },
        ],
      },
      compare_branch: {
        differences: [
          {
            value: 'gf1',
            path: 'title',
          },
          {
            value: 'url',
            path: 'url1',
          },
        ],
      },
    },
  },
  verboseRes: {
    listOfAddedFields: [
      {
        path: 'url1',
        displayName: undefined,
        uid: undefined,
        fieldType: 'Metadata Field',
      },
    ],
    listOfDeletedFields: [
      {
        path: 'schema[3]',
        displayName: 'Single Line Textbox33',
        uid: 'single_line_textbox33',
        fieldType: 'Single Line Textbox33 Field',
      },
    ],
    listOfModifiedFields: [
      {
        path: 'title',
        displayName: undefined,
        uid: undefined,
        fieldType: 'Metadata Field',
      },
    ],
  },
  mergeSettings: {
    baseBranch: 'main', // UID of the base branch, where the changes will be merged into
    compareBranch: 'dev', // UID of the branch to merge
    mergeComment: 'changes',
    mergeContent: {},
    noRevert: false,
  },
  mergePayload: {
    base_branch: 'main', // UID of the base branch, where the changes will be merged into
    compare_branch: 'dev', // UID of the branch to merge
    default_merge_strategy: '',
    item_merge_strategies: '',
    merge_comment: 'changes',
    no_revert: false,
    uid: 'abc'
  },
  mergeCompleteStatusRes: {
    merge_details: { status: 'complete', uid: 'abc' },
  },
  mergeProgressStatusRes: {
    merge_details: { status: 'in_progress', uid: 'abc' },
  },
  mergeFailedStatusRes: {
    merge_details: { status: 'failed', uid: 'abc' },
  },
  mergeNoStatusRes: {
    merge_details: { status: '', uid: 'abc' },
  },
  mergeInputOptions:{
    compareBranch: 'dev',
    strategy: 'merge_prefer_base',
    strategySubOption: 'merge_new_only',
    branchCompareData: '',
    stackAPIKey: 'abcdscdxx',
    baseBranch: 'main'
  },
  mergeInputOptionsWithoutStartegy:{
    compareBranch: 'dev',
    strategy:'',
    strategySubOption: '',
    branchCompareData: {},
    stackAPIKey: 'abcdscdxx',
    baseBranch: 'main'
  },
  mergeData: {
    flags: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      'stack-api-key': 'sfgfdsg223',
      module: 'content_types',
      format: 'compactText',
    },
    withoutBaseFlag: {
      'compare-branch': 'dev',
      'stack-api-key': 'sfgfdsg223',
      module: 'content_types',
      format: 'compactText',
    },
    withoutCompareFlag: {
      'base-branch': 'main',
      'stack-api-key': 'sfgfdsg223',
      module: 'content_types',
      format: 'compactText',
    },
    withoutAPIKeyFlag: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      module: 'content_types',
      format: 'compactText',
    },
    withoutModuleFlag: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      'stack-api-key': 'sfgfdsg223',
      format: 'compactText',
    },
    branchCompareData: {
      content_types: {
        modified: [
          {
            uid: 'content_type1',
            title: 'Content Type1',
            type: 'content_types',
            status: 'modified',
          },
        ],
        added: [
          {
            uid: 'content_type2',
            title: 'Content Type 2',
            type: 'content_types',
            status: 'compare_only',
          },
        ],
        deleted: [
          {
            uid: 'content_type3',
            title: 'Content Type 3',
            type: 'content_types',
            status: 'base_only',
          },
        ],
      },
      global_fields: {
        modified: [
          {
            uid: 'global_fields1',
            title: 'Global Fields1',
            type: 'global_fields',
            status: 'modified',
          },
        ],
        added: [
          {
            uid: 'global_fields2',
            title: 'Global Fields 2',
            type: 'global_fields',
            status: 'compare_only',
          },
        ],
        deleted: [
          {
            uid: 'global_fields3',
            title: 'Global Fields 3',
            type: 'global_fields',
            status: 'base_only',
          },
        ],
      },
    },
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
          api_key: 'bltxxxxxxxxxxxx',
        },
        urlPath: '/stacks/branches/new_branch',
        uid: 'new_branch',
        source: 'main',
        created_by: 'bltxxxxxxxxxxxxxxx',
        updated_by: 'bltxxxxxxxxxxxxxxx',
        created_at: '2023-03-02T12:53:18.809Z',
        updated_at: '2023-03-02T12:53:19.208Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'bltxxxxxxxxxxxxxxx',
        },
        urlPath: '/stacks/branches/test_branch',
        uid: 'test_branch',
        source: 'main',
        created_by: 'bltxxxxxxxxxxxxxxx',
        updated_by: 'bltxxxxxxxxxxxxxxx',
        created_at: '2023-03-01T09:36:18.174Z',
        updated_at: '2023-03-01T09:36:18.538Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'bltxxxxxxxxxxxxxxx',
        },
        urlPath: '/stacks/branches/new',
        uid: 'new',
        source: 'main',
        created_by: 'bltxxxxxxxxxxxxxxx',
        updated_by: 'bltxxxxxxxxxxxxxxx',
        created_at: '2023-01-11T08:55:51.556Z',
        updated_at: '2023-01-11T08:55:51.869Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'bltxxxxxxxxxxxxxxx',
        },
        urlPath: '/stacks/branches/main',
        uid: 'main',
        source: '',
        created_by: 'bltxxxxxxxxxxxxxxx',
        updated_by: 'bltxxxxxxxxxxxxxxx',
        created_at: '2022-09-27T06:11:29.016Z',
        updated_at: '2022-11-18T09:54:41.671Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: 'bltxxxxxxxxxxxxxxx',
        },
        urlPath: '/stacks/branches/release',
        uid: 'release',
        source: 'develop',
        created_by: 'bltxxxxxxxxxxxxxxx',
        updated_by: 'bltxxxxxxxxxxxxxxx',
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
