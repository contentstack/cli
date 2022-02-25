module.exports = {
  stack: {
    created_at: '2019-11-04T07:54:05.013Z',
    updated_at: '2019-11-04T07:54:05.877Z',
    uid: '***REMOVED***',
    name: 'cross-publishing-test',
    description: 'stack for cross environment publishing test',
    org_uid: '***REMOVED***',
    api_key: '***REMOVED***',
    master_locale: 'en-us',
    is_asset_download_public: true,
    owner_uid: '***REMOVED***',
    user_uids: [
      '***REMOVED***',
    ],
    settings: {
      version: '2019-04-30',
      rte_version: 3,
      webhook_enabled: true,
      language_fallback: false,
    },
    master_key: '***REMOVED***',
    SYS_ACL: {
      others: {
        invite: false,
        sub_acl: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      },
      roles: [
        {
          uid: '***REMOVED***',
          name: 'Developer',
          invite: true,
          sub_acl: {
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        },
        {
          uid: '***REMOVED***',
          name: 'Admin',
          invite: true,
          sub_acl: {
            create: true,
            read: true,
            update: true,
            delete: true,
          },
        },
      ],
    },
    global_search: true,
  },
};
