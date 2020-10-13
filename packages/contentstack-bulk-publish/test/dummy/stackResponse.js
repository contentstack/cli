module.exports = {
  stack: {
    created_at: '2019-11-04T07:54:05.013Z',
    updated_at: '2019-11-04T07:54:05.877Z',
    uid: 'blt88742805ce18a9c7',
    name: 'cross-publishing-test',
    description: 'stack for cross environment publishing test',
    org_uid: 'bltff6ec735225b72b5',
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
          uid: 'blt96731c8116bde66d',
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
          uid: 'blt4984bf8fd093b31c',
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
