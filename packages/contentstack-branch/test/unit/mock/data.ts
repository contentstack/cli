const mockData = {
  flags: {
    baseBranch: 'main',
    compareBranch: 'dev',
    stackAPIKey: 'sfgfdsg223',
    module: 'content_types',
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
          type: 'content_type',
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
    content_type: [
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
  globalFieldsDiffData: {
    global_fields: [],
    content_types: [
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
      type: 'global_fields',
      status: 'modified',
      base_branch: {
        differences: [
          {
            value: 'gf4',
            path: 'title',
          },
          {
            data_type: 'text',
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
export { mockData, createBranchMockData, deleteBranchMockData };
