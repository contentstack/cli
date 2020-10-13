module.exports = {
  created_at: '2020-02-25T05:19:53.403Z',
  updated_at: '2020-03-22T21:59:09.071Z',
  title: 'helloworld',
  uid: 'dummyContentType',
  _version: 59,
  inbuilt_class: false,
  schema: [
  {
    display_name: 'Title',
    uid: 'title',
    data_type: 'text',
    mandatory: true,
    unique: true,
    field_metadata: {
      _default: true,
      version: 3,
    },
    multiple: false,
    non_localizable: false,
  },
  {
    display_name: 'URL',
    uid: 'url',
    data_type: 'text',
    mandatory: true,
    field_metadata: {
      _default: true,
      version: 3,
    },
    multiple: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'Multi line textbox',
    uid: 'multi_line',
    field_metadata: {
      description: '',
      default_value: '',
      multiline: true,
      version: 3,
    },
    format: '',
    error_messages: {
      format: '',
    },
    non_localizable: true,
    multiple: false,
    mandatory: false,
    unique: false,
  },
  {
    data_type: 'text',
    display_name: 'Markdown',
    uid: 'markdown',
    field_metadata: {
      description: '',
      markdown: true,
      version: 3,
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'group',
    display_name: 'Group',
    field_metadata: {},
    schema: [
    {
      data_type: 'text',
      display_name: 'Multi line textbox',
      uid: 'multi_line',
      field_metadata: {
        description: '',
        default_value: '233',
        multiline: true,
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    {
      data_type: 'text',
      display_name: 'Single line textbox',
      uid: 'single_line',
      field_metadata: {
        description: '',
        default_value: '',
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    ],
    uid: 'group',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'boolean',
    display_name: 'Boolean',
    uid: 'boolean',
    field_metadata: {
      description: '',
      default_value: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'Single line textbox',
    uid: 'single_line',
    field_metadata: {
      description: '',
      default_value: 'Dinesh gowda',
      version: 3,
    },
    format: '',
    error_messages: {
      format: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'number',
    display_name: 'Numberggj',
    uid: 'numberggj',
    field_metadata: {
      description: '',
      default_value: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'number',
    display_name: 'Number',
    uid: 'number',
    field_metadata: {
      description: '',
      default_value: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'Rich text editor',
    uid: 'rich_text_editor',
    field_metadata: {
      allow_rich_text: true,
      description: '',
      multiline: false,
      rich_text_type: 'advanced',
      options: [],
      version: 3,
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'isodate',
    display_name: 'Date',
    uid: 'date',
    startDate: null,
    endDate: null,
    field_metadata: {
      description: '',
      default_value: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'group',
    display_name: 'Group',
    field_metadata: {},
    schema: [
    {
      data_type: 'link',
      display_name: 'Link',
      uid: 'link',
      field_metadata: {
        description: '',
        default_value: {
          title: 'j',
          url: 'jjj',
        },
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    ],
    uid: 'hhhhgroup',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'azhar',
    uid: 'azhar',
    field_metadata: {
      description: '',
      markdown: true,
      version: 3,
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'dinesh',
    uid: 'dinesh',
    field_metadata: {
      description: '',
      default_value: 'this is us',
      multiline: true,
      version: 3,
    },
    format: '',
    error_messages: {
      format: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: true,
  },
  {
    data_type: 'group',
    display_name: 'Group',
    field_metadata: {},
    schema: [
    {
      data_type: 'text',
      display_name: 'Single line textbox',
      uid: 'single_line',
      field_metadata: {
        description: '',
        default_value: '',
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    {
      data_type: 'group',
      display_name: 'Group',
      field_metadata: {},
      schema: [
      {
        data_type: 'text',
        display_name: 'Rich text editor',
        uid: 'rich_text_editor',
        field_metadata: {
          allow_rich_text: true,
          description: '',
          multiline: false,
          rich_text_type: 'advanced',
          options: [],
          version: 3,
        },
        non_localizable: true,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      ],
      uid: 'group',
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    {
      data_type: 'group',
      display_name: 'Group',
      field_metadata: {},
      schema: [
      {
        data_type: 'group',
        display_name: 'Group',
        field_metadata: {},
        schema: [
        {
          data_type: 'text',
          display_name: 'Multi line textbox',
          uid: 'multi_line',
          field_metadata: {
            description: '',
            default_value: '',
            multiline: true,
            version: 3,
          },
          format: '',
          error_messages: {
            format: '',
          },
          non_localizable: true,
          multiple: false,
          mandatory: false,
          unique: false,
        },
        ],
        uid: 'groupj',
        multiple: false,
        mandatory: false,
        unique: false,
        non_localizable: false,
      },
      ],
      uid: 'hgroup',
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    ],
    uid: 'groupjj',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'text',
    display_name: 'dinya',
    uid: 'dinya',
    field_metadata: {
      description: '',
      default_value: 'ewdfefe',
      multiline: true,
      version: 3,
    },
    format: '',
    error_messages: {
      format: '',
    },
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'blocks',
    display_name: 'Modular Blocks',
    blocks: [
    {
      title: 'modular1',
      uid: 'modular1',
      schema: [
      {
        data_type: 'text',
        display_name: 'please',
        uid: 'please',
        field_metadata: {
          description: '',
          default_value: 'go corona',
          multiline: true,
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Markdown',
        uid: 'markdown',
        field_metadata: {
          description: '',
          markdown: true,
          version: 3,
        },
        non_localizable: false,
        multiple: true,
        mandatory: false,
        unique: false,
      },
      ],
    },
    {
      title: 'modular2',
      uid: 'modular2',
      schema: [
      {
        data_type: 'text',
        display_name: 'dinesh_gowda',
        uid: 'dinesh_gowda',
        field_metadata: {
          allow_rich_text: true,
          description: '',
          multiline: false,
          rich_text_type: 'advanced',
          options: [],
          version: 3,
        },
        non_localizable: false,
        multiple: true,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Multi line textbox',
        uid: 'multi_line',
        field_metadata: {
          description: '',
          default_value: '',
          multiline: true,
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      ],
    },
    {
      title: 'dinesh',
      uid: 'dinesh',
      schema: [
      {
        data_type: 'text',
        display_name: 'Single line textbox',
        uid: 'single_line',
        field_metadata: {
          description: '',
          default_value: '',
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Rich text editor',
        uid: 'rich_text_editor',
        field_metadata: {
          allow_rich_text: true,
          description: '',
          multiline: false,
          rich_text_type: 'advanced',
          options: [],
          version: 3,
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      ],
    },
    {
      title: 'SHIBHA',
      uid: 'shibha',
      schema: [
      {
        data_type: 'text',
        display_name: 'Single line textbox',
        uid: 'single_line',
        field_metadata: {
          description: '',
          default_value: '',
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'group',
        display_name: 'Group',
        field_metadata: {},
        schema: [
        {
          data_type: 'text',
          display_name: 'Rich text editor',
          uid: 'rich_text_editor',
          field_metadata: {
            allow_rich_text: true,
            description: '',
            multiline: false,
            rich_text_type: 'advanced',
            options: [],
            version: 3,
          },
          non_localizable: false,
          multiple: false,
          mandatory: false,
          unique: false,
        },
        ],
        uid: 'group',
        non_localizable: false,
        multiple: true,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Multi line textbox',
        uid: 'multi_line',
        field_metadata: {
          description: '',
          default_value: '',
          multiline: true,
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Rich text editor',
        uid: 'rich_text_editor',
        field_metadata: {
          allow_rich_text: true,
          description: '',
          multiline: false,
          rich_text_type: 'advanced',
          options: [],
          version: 3,
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      ],
    },
    ],
    multiple: true,
    uid: 'modular_blocks',
    field_metadata: {},
    mandatory: false,
    unique: false,
    non_localizable: true,
  },
  {
    data_type: 'blocks',
    display_name: 'checks',
    blocks: [
    {
      title: 'd1',
      uid: 'd1',
      schema: [
      {
        data_type: 'blocks',
        display_name: 'Modular Blocks',
        blocks: [
        {
          title: 'asd',
          uid: 'asd',
          schema: [
          {
            data_type: 'text',
            display_name: 'Single line textbox',
            uid: 'single_line',
            field_metadata: {
              description: '',
              default_value: 'qdedcew',
              version: 3,
            },
            format: '',
            error_messages: {
              format: '',
            },
            non_localizable: false,
            multiple: true,
            mandatory: false,
            unique: false,
          },
          {
            data_type: 'text',
            display_name: 'Markdown',
            uid: 'markdown',
            field_metadata: {
              description: '',
              markdown: true,
              version: 3,
            },
            non_localizable: false,
            multiple: false,
            mandatory: false,
            unique: false,
          },
          ],
        },
        ],
        multiple: true,
        uid: 'modular_blocks',
        field_metadata: {},
        non_localizable: false,
        mandatory: false,
        unique: false,
      },
      ],
    },
    ],
    multiple: true,
    uid: 'dinu',
    field_metadata: {},
    mandatory: false,
    unique: false,
    non_localizable: true,
  },
  {
    data_type: 'group',
    display_name: 'sinehs',
    field_metadata: {},
    schema: [
    {
      data_type: 'text',
      display_name: 'Markdown',
      uid: 'markdown',
      field_metadata: {
        description: '',
        markdown: true,
        version: 3,
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    {
      data_type: 'text',
      display_name: 'Rich text editor',
      uid: 'rich_text_editor',
      field_metadata: {
        allow_rich_text: true,
        description: '',
        multiline: false,
        rich_text_type: 'advanced',
        options: [],
        version: 3,
      },
      multiple: true,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    ],
    uid: 'sinehs',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'global_field',
    display_name: 'edw',
    reference_to: 'dineu',
    field_metadata: {
      description: '',
    },
    uid: 'edw',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
    schema: [
    {
      data_type: 'text',
      display_name: 'Single line textbox',
      uid: 'single_line',
      field_metadata: {
        description: '',
        default_value: '',
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: true,
      indexed: false,
      inbuilt_model: false,
    },
    {
      data_type: 'text',
      display_name: 'Multi line textbox',
      uid: 'multi_line_din',
      field_metadata: {
        description: '',
        default_value: '',
        multiline: true,
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: true,
      indexed: false,
      inbuilt_model: false,
    },
    ],
  },
  {
    data_type: 'group',
    display_name: 'Group',
    field_metadata: {},
    schema: [
    {
      data_type: 'text',
      display_name: 'Multi line textbox',
      uid: 'multi_line',
      field_metadata: {
        description: '',
        default_value: 'working test',
        multiline: true,
        version: 3,
      },
      format: '',
      error_messages: {
        format: '',
      },
      multiple: false,
      mandatory: false,
      unique: false,
      non_localizable: false,
    },
    ],
    uid: 'group_tes',
    multiple: false,
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'blocks',
    display_name: 'tetsyp',
    blocks: [
    {
      title: 'testing',
      uid: 'testing',
      schema: [
      {
        data_type: 'text',
        display_name: 'Multi line textbox',
        uid: 'multi_line',
        field_metadata: {
          description: '',
          default_value: '',
          multiline: true,
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      {
        data_type: 'text',
        display_name: 'Single line textbox',
        uid: 'single_line',
        field_metadata: {
          description: '',
          default_value: '',
          version: 3,
        },
        format: '',
        error_messages: {
          format: '',
        },
        non_localizable: false,
        multiple: false,
        mandatory: false,
        unique: false,
      },
      ],
    },
    ],
    multiple: true,
    uid: 'tetsyp',
    field_metadata: {},
    mandatory: false,
    unique: false,
    non_localizable: false,
  },
  {
    data_type: 'group',
    display_name: 'Group_din',
    field_metadata: {},
    schema: [
    {
      data_type: 'text',
      display_name: 'Rich text editorwde',
      uid: 'rich_text_editorwde',
      field_metadata: {
        allow_rich_text: true,
        description: '',
        multiline: false,
        rich_text_type: 'advanced',
        options: [],
        version: 3,
      },
      non_localizable: false,
      multiple: false,
      mandatory: false,
      unique: false,
    },
    ],
    uid: 'group_din',
    multiple: true,
    non_localizable: false,
    mandatory: false,
    unique: false,
  },
  ],
  last_activity: {
    environments: [
    {
      uid: 'blt56e125f207cd669e',
      details: [
      {
        locale: 'en-us',
        time: '2020-03-16T13:25:44.519Z',
      },
      ],
    },
    {
      uid: 'blt98195f852552a780',
      details: [
      {
        locale: 'en-us',
        time: '2020-03-17T14:39:54.070Z',
      },
      ],
    },
    {
      uid: 'bltc0c97f25bc259354',
      details: [
      {
        locale: 'es',
        time: '2020-03-22T21:35:46.030Z',
      },
      {
        locale: 'fr-fr',
        time: '2020-03-22T21:34:35.644Z',
      },
      {
        locale: 'en-us',
        time: '2020-03-16T13:03:44.049Z',
      },
      {
        locale: 'ar-eg',
        time: '2020-03-03T11:24:39.582Z',
      },
      ],
    },
    {
      uid: 'blt6e988221145bc2e7',
      details: [
      {
        locale: 'en-us',
        time: '2020-03-22T22:04:29.024Z',
      },
      {
        locale: 'es',
        time: '2020-03-22T21:44:59.512Z',
      },
      {
        locale: 'ar-eg',
        time: '2020-03-22T21:39:01.620Z',
      },
      {
        locale: 'fr-fr',
        time: '2020-03-22T21:36:55.870Z',
      },
      ],
    },
    ],
  },
  maintain_revisions: true,
  description: '',
  DEFAULT_ACL: {
    others: {
      read: false,
      create: false,
    },
    users: [
    {
      uid: 'bltfb478f930c364f38',
      read: true,
      sub_acl: {
        read: true,
      },
    },
    ],
  },
  SYS_ACL: {
    roles: [
    {
      uid: 'blt96731c8116bde66d',
      read: true,
      sub_acl: {
        create: true,
        read: true,
        update: true,
        delete: true,
        publish: true,
      },
      update: true,
      delete: true,
    },
    {
      uid: 'bltca998c03ca411f1d',
      read: true,
      sub_acl: {
        create: true,
        read: true,
        update: true,
        delete: true,
        publish: true,
      },
    },
    {
      uid: 'blt4984bf8fd093b31c',
      read: true,
      sub_acl: {
        create: true,
        read: true,
        update: true,
        delete: true,
        publish: true,
      },
      update: true,
      delete: true,
    },
    ],
    others: {
      read: false,
      create: false,
      update: false,
      delete: false,
      sub_acl: {
        read: false,
        create: false,
        update: false,
        delete: false,
        publish: false,
      },
    },
  },
  options: {
    is_page: true,
    singleton: true,
    title: 'title',
    sub_title: [],
  },
  abilities: {
    get_one_object: true,
    get_all_objects: true,
    create_object: true,
    update_object: true,
    delete_object: true,
    delete_all_objects: true,
  },
  extension_uids: [],
};
