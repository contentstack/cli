const config = require('../../config.json');
const mockData = {
  flags: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: config.stackAPIKey,
    module: 'content-types',
    format: 'compactfield',
  },
  withoutBaseFlag: {
    compareBranch: 'dev',
    stackAPIKey: config.stackAPIKey,
    module: 'content-types',
    format: 'compactfield',
  },
  withoutCompareFlag: {
    baseBranch: 'main',
    stackAPIKey: config.stackAPIKey,
    module: 'content-types',
    format: 'compactfield',
    compareBranch: '',
  },
  withoutAPIKeyFlag: {
    baseBranch: 'main',
    compareBranch: 'dev',
    module: 'content-types',
    format: 'compactfield',
    stackAPIKey: '',
  },
  withoutModuleFlag: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: config.stackAPIKey,
    format: 'compactfield',
    module: '',
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
  contentTypesDiff: [
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
  branchTextData: {
    modified: [
      {
        uid: 'content_type_uid_2',
        title: 'Content Type 2 Title',
        type: 'content_type',
        status: 'modified',
      },
    ],
    deleted: [],
    added: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_type',
        status: 'compare_only',
      },
    ],
  },
  globalFieldDiff: [
    {
      uid: 'global_field_uid_1',
      title: 'Global Field 1 Title',
      type: 'global_field',
      status: 'compare_only',
    },
    {
      uid: 'global_field_uid_2',
      title: 'Global Field 2 Title',
      type: 'global_field',
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
        type: 'content_type',
        status: 'modified',
      },
    ],
    added: [
      {
        uid: 'content_type2',
        title: 'Content Type 2',
        type: 'content_type',
        status: 'compare_only',
      },
    ],
    deleted: [
      {
        uid: 'content_type3',
        title: 'Content Type 3',
        type: 'content_type',
        status: 'base_only',
      },
    ],
  },
  branchDiffPayload: {
    module: 'content_type',
    apiKey: config.apiKey,
    baseBranch: 'main',
    compareBranch: 'dev',
  },
  verboseContentTypeRes: {
    modified: [
      {
        moduleDetails: {
          uid: 'content_type_uid_2',
          title: 'Content Type 2 Title',
          type: 'content_type',
          status: 'modified',
        },
        modifiedFields: {
          modified: [
            {
              uid: 'url',
              displayName: 'field1',
              path: 'url',
              field: 'URL field',
            },
          ],
          deleted: [
            {
              uid: 'url1',
              displayName: 'field2',
              path: 'url1',
              field: 'URL field',
            },
          ],
          added: [
            {
              uid: 'url2',
              displayName: 'field3',
              path: 'url2',
              field: 'URL field',
            },
          ],
        },
      },
    ],
    added: [
      {
        uid: 'content_type_uid_1',
        title: 'Content Type 1 Title',
        type: 'content_type',
        status: 'compare_only',
      },
    ],
    deleted: [
      {
        uid: 'content_type_uid_3',
        title: 'Content Type 3 Title',
        type: 'content_type',
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
    global_fields: [],
  },
  globalFieldsDiffData: {
    content_types: [],
    global_fields: [
      {
        uid: 'global_field_uid_1',
        title: 'Global Field 1 Title',
        type: 'global_field',
        status: 'compare_only',
      },
      {
        uid: 'global_field_uid_2',
        title: 'Global Field 2 Title',
        type: 'global_field',
        status: 'modified',
      },
    ],
  },
  allDiffData: [
    {
      uid: 'global_field_uid_1',
      title: 'Global Field 1 Title',
      type: 'global_field',
      status: 'compare_only',
    },
    {
      uid: 'global_field_uid_2',
      title: 'Global Field 2 Title',
      type: 'global_field',
      status: 'modified',
    },
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
  moduleWiseData: {
    content_types: [
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
    global_fields: [
      {
        uid: 'global_field_uid_1',
        title: 'Global Field 1 Title',
        type: 'global_field',
        status: 'compare_only',
      },
      {
        uid: 'global_field_uid_2',
        title: 'Global Field 2 Title',
        type: 'global_field',
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
      type: 'global_field',
      status: 'modified',
      base_branch: {
        differences: [
          {
            value: 'gf4',
            path: 'title',
          },
          {
            data_type: 'compactfield',
            display_name: 'Single Line fieldbox33',
            uid: 'single_line_fieldbox33',
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
        path: undefined,
        displayName: undefined,
        uid: undefined,
        field: undefined,
      },
    ],
    listOfDeletedFields: [
      {
        path: 'single_line_fieldbox33',
        displayName: 'Single Line fieldbox33',
        uid: 'single_line_fieldbox33',
        field: 'compactfield',
      },
    ],
    listOfModifiedFields: [
      {
        path: 'title',
        displayName: 'Name',
        uid: 'title',
        field: 'metadata',
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
    uid: 'abc',
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
  mergeInputOptions: {
    compareBranch: 'dev',
    strategy: 'merge_prefer_base',
    strategySubOption: 'merge_new_only',
    branchCompareData: '',
    stackAPIKey: config.stackAPIKey2,
    baseBranch: 'main',
    host: '',
    enableEntryExp: false,
  },
  mergeInputOptionsWithoutStartegy: {
    compareBranch: 'dev',
    strategy: '',
    strategySubOption: '',
    branchCompareData: {},
    stackAPIKey: config.stackAPIKey2,
    baseBranch: 'main',
    host: '',
    enableEntryExp: false,
  },
  mergeData: {
    flags: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      'stack-api-key': '***REMOVED***',
      module: 'content_type',
      format: 'compactfield',
    },
    withoutBaseFlag: {
      'compare-branch': 'dev',
      'stack-api-key': '***REMOVED***',
      module: 'content_type',
      format: 'compactfield',
    },
    withoutCompareFlag: {
      'base-branch': 'main',
      'stack-api-key': '***REMOVED***',
      module: 'content_type',
      format: 'compactfield',
    },
    withoutAPIKeyFlag: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      module: 'content_type',
      format: 'compactfield',
    },
    withoutModuleFlag: {
      'base-branch': 'main',
      'compare-branch': 'dev',
      'stack-api-key': '***REMOVED***',
      format: 'compactfield',
    },
    branchCompareData: {
      content_types: {
        modified: [
          {
            uid: 'content_type1',
            title: 'Content Type1',
            type: 'content_type',
            status: 'modified',
          },
        ],
        added: [
          {
            uid: 'content_type2',
            title: 'Content Type 2',
            type: 'content_type',
            status: 'compare_only',
          },
        ],
        deleted: [
          {
            uid: 'content_type3',
            title: 'Content Type 3',
            type: 'content_type',
            status: 'base_only',
          },
        ],
      },
      global_fields: {
        modified: [
          {
            uid: 'global-fields1',
            title: 'Global Fields1',
            type: 'global_field',
            status: 'modified',
          },
        ],
        added: [
          {
            uid: 'global-fields2',
            title: 'Global Fields 2',
            type: 'global_field',
            status: 'compare_only',
          },
        ],
        deleted: [
          {
            uid: 'global-fields3',
            title: 'Global Fields 3',
            type: 'global_field',
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
          api_key: config.api_key,
        },
        urlPath: '/stacks/branches/new_branch',
        uid: 'new_branch',
        source: 'main',
        created_by: 'testStringxxx',
        updated_by: 'testStringxxx',
        created_at: '2023-03-02T12:53:18.809Z',
        updated_at: '2023-03-02T12:53:19.208Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: config.api_key,
        },
        urlPath: '/stacks/branches/test_branch',
        uid: 'test_branch',
        source: 'main',
        created_by: 'testStringxxx',
        updated_by: 'testStringxxx',
        created_at: '2023-03-01T09:36:18.174Z',
        updated_at: '2023-03-01T09:36:18.538Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: config.api_key,
        },
        urlPath: '/stacks/branches/new',
        uid: 'new',
        source: 'main',
        created_by: 'testStringxxx',
        updated_by: 'testStringxxx',
        created_at: '2023-01-11T08:55:51.556Z',
        updated_at: '2023-01-11T08:55:51.869Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: config.api_key,
        },
        urlPath: '/stacks/branches/main',
        uid: 'main',
        source: '',
        created_by: 'testStringxxx',
        updated_by: 'testStringxxx',
        created_at: '2022-09-27T06:11:29.016Z',
        updated_at: '2022-11-18T09:54:41.671Z',
        deleted_at: false,
        alias: [],
      },
      {
        stackHeaders: {
          api_key: config.api_key,
        },
        urlPath: '/stacks/branches/release',
        uid: 'release',
        source: 'develop',
        created_by: 'testStringxxx',
        updated_by: 'testStringxxx',
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

const baseBranchDiff = {
  data_type: 'group',
  display_name: 'Social',
  field_metadata: {},
  schema: [
    {
      data_type: 'group',
      display_name: 'Social Share',
      field_metadata: {},
      schema: [
        {
          data_type: 'link',
          display_name: 'Link',
          uid: 'link',
          field_metadata: {
            description: '',
            default_value: '',
            isTitle: true,
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
          indexed: false,
          inbuilt_model: false,
        },
        {
          data_type: 'file',
          display_name: 'Icon',
          uid: 'icon',
          field_metadata: {
            description: '',
            rich_text_type: 'standard',
            image: true,
          },
          non_localizable: false,
          dimension: {
            width: {
              min: null,
              max: null,
            },
            height: {
              min: null,
              max: null,
            },
          },
          multiple: false,
          mandatory: true,
          unique: false,
          indexed: false,
          inbuilt_model: false,
        },
      ],
      uid: 'social_share',
      multiple: true,
      mandatory: false,
      unique: false,
      non_localizable: false,
      indexed: false,
      inbuilt_model: false,
    },
  ],
  uid: 'social',
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
  indexed: true,
  inbuilt_model: false,
  path: 'schema[3]',
};
const baseBranchNoSchema = {
  data_type: 'group',
  display_name: 'Social',
  field_metadata: {},
  uid: 'social',
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
  indexed: true,
  inbuilt_model: false,
  path: 'schema[3]',
};
const compareBranchDiff = {
  data_type: 'group',
  display_name: 'Social',
  field_metadata: {},
  schema: [
    {
      data_type: 'group',
      display_name: 'Social Share',
      field_metadata: {},
      schema: [
        {
          data_type: 'link',
          display_name: 'Link',
          uid: 'link',
          field_metadata: {
            description: '',
            default_value: '',
            isTitle: true,
          },
          multiple: false,
          mandatory: false,
          unique: true,
          non_localizable: false,
          indexed: false,
          inbuilt_model: false,
        },
        {
          data_type: 'link',
          display_name: 'Link1',
          uid: 'link1',
          field_metadata: {
            description: '',
            default_value: '',
            isTitle: true,
          },
          multiple: false,
          mandatory: false,
          unique: false,
          non_localizable: false,
          indexed: false,
          inbuilt_model: false,
        },
      ],
      uid: 'social_share',
      multiple: true,
      mandatory: false,
      unique: false,
      non_localizable: false,
      indexed: false,
      inbuilt_model: false,
    },
  ],
  uid: 'social',
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
  inbuilt_model: false,
  path: 'schema[3]',
};
const compareBranchNoSchema = {
  data_type: 'group',
  display_name: 'Social',
  field_metadata: {},
  uid: 'social',
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
  inbuilt_model: false,
  path: 'schema[3]',
};

const baseAndCompareChanges = {
  baseAndCompareHavingSchema: {
    modified: {
      social: {
        path: 'social',
        uid: 'social',
        displayName: 'Social',
        fieldType: 'group',
      },
      'social.social_share.link': {
        path: 'social.social_share.link',
        uid: 'link',
        displayName: 'Link',
        fieldType: 'link',
      },
    },
    added: {
      'social.social_share.link1': {
        path: 'social.social_share.link1',
        uid: 'link1',
        displayName: 'Link1',
        fieldType: 'link',
      },
    },
    deleted: {
      'social.social_share.icon': {
        path: 'social.social_share.icon',
        uid: 'icon',
        displayName: 'Icon',
        fieldType: 'file',
      },
    },
  },
  baseHavingSchema: {
    modified: {
      social: {
        path: 'social',
        uid: 'social',
        displayName: 'Social',
        fieldType: 'group',
      },
    },
    added: {},
    deleted: {
      'social.social_share': {
        path: 'social.social_share',
        uid: 'social_share',
        displayName: 'Social Share',
        fieldType: 'group',
      },
    },
  },
  compareHavingSchema: {
    modified: {
      social: {
        path: 'social',
        uid: 'social',
        displayName: 'Social',
        fieldType: 'group',
      },
    },
    added: {
      'social.social_share': {
        path: 'social.social_share',
        uid: 'social_share',
        displayName: 'Social Share',
        fieldType: 'group',
      },
    },
    deleted: {},
  },
  modifiedFieldRes: {
    listOfAddedFields: [
      {
        path: undefined,
        displayName: undefined,
        uid: undefined,
        field: undefined,
      },
    ],
    listOfDeletedFields: [
      {
        path: 'single_line_fieldbox33',
        displayName: 'Single Line fieldbox33',
        uid: 'single_line_fieldbox33',
        field: 'compactfield',
      },
    ],
    listOfModifiedFields: [
      {
        path: 'title',
        displayName: 'Name',
        uid: 'title',
        field: 'metadata',
      },
    ],
  },
};

export {
  mockData,
  createBranchMockData,
  deleteBranchMockData,
  branchMockData,
  baseBranchDiff,
  compareBranchDiff,
  compareBranchNoSchema,
  baseBranchNoSchema,
  baseAndCompareChanges,
};
