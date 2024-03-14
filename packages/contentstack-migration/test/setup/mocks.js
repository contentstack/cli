/* eslint-disable camelcase */

const createContentType = {
  response: {
    content_type: {
      title: 'foo3',
      uid: 'foo3',
      description: 'sample description',
      options: { is_page: true, singleton: false, title: 'foo3', description: 'sample description' },
      schema: [
        {
          display_name: 'Title',
          uid: 'title',
          data_type: 'text',
          mandatory: true,
          unique: true,
          field_metadata: { _default: true, version: 3 },
          non_localizable: false,
          isDelete: false,
          isEdit: false,
        },
        {
          display_name: 'URL',
          uid: 'url',
          data_type: 'text',
          mandatory: true,
          unique: true,
          field_metadata: { _default: true, version: 3 },
          non_localizable: false,
          isDelete: false,
          isEdit: false,
        },
      ],
    },
  },
  request: {
    notice: 'Content Type created successfully.',
    content_type: {
      created_at: '2021-08-17T05:04:52.623Z',
      updated_at: '2021-08-17T05:04:52.623Z',
      title: 'foo3',
      uid: 'foo3',
      _version: 1,
      inbuilt_class: false,
      schema: [
        {
          display_name: 'Title',
          uid: 'title',
          data_type: 'text',
          mandatory: true,
          unique: true,
          field_metadata: { _default: true, version: 3 },
          non_localizable: false,
          multiple: false,
        },
        {
          display_name: 'URL',
          uid: 'url',
          data_type: 'text',
          mandatory: false,
          unique: true,
          field_metadata: { _default: true, version: 3 },
          non_localizable: false,
          multiple: false,
        },
      ],
      last_activity: {},
      maintain_revisions: true,
      description: 'sample description',
      DEFAULT_ACL: {
        others: { read: false, create: false },
        users: [{ read: true, sub_acl: { read: true }, uid: 'blt9228a34ebcbe7a3f' }],
        management_token: { read: true },
      },
      SYS_ACL: {
        roles: [],
        others: {
          read: false,
          create: false,
          update: false,
          delete: false,
          sub_acl: { read: false, create: false, update: false, delete: false, publish: false },
        },
      },
      options: {
        is_page: true,
        singleton: false,
        title: 'foo3',
        description: 'sample description',
        url_pattern: '/:title',
        url_prefix: '/',
      },
      abilities: {
        get_one_object: true,
        get_all_objects: true,
        create_object: true,
        update_object: true,
        delete_object: true,
        delete_all_objects: true,
      },
    },
  },
};

module.exports = {
  createContentType,
};
