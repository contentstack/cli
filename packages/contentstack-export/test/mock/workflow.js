module.exports = {
  items: [
    {
      Dummyworkflow: {
        name: 'test',
        description: 'cdbhchcd',
        uid: 'dummyUid',
        org_uid: 'dummyOrgId',
        api_key: 'dummyApiKey',
        content_types: ['$all'],
        workflow_stages: [
          {
            name: 'test',
            uid: 'dummyUid2',
            color: '#2196f3',
            description: 'dcbhdchdcvhd',
            SYS_ACL: {
              others: {
                read: true,
                write: true,
                transit: false,
              },
              users: {
                uids: ['$all'],
                read: true,
                write: true,
                transit: true,
              },
              roles: {
                uids: [],
                read: true,
                write: true,
                transit: true,
              },
            },
            next_available_stages: ['$all'],
          },
          {
            name: 'test2',
            uid: 'bltd9fc966528b4b72f',
            color: '#ec407a',
            description: 'testdnckjdchjkdchdc',
            SYS_ACL: {
              others: {
                read: true,
                write: true,
                transit: false,
              },
              users: {
                uids: ['$all'],
                read: true,
                write: true,
                transit: true,
              },
              roles: {
                uids: [],
                read: true,
                write: true,
                transit: true,
              },
            },
            next_available_stages: ['$all'],
          },
        ],
        admin_users: {
          users: ['***REMOVED***'],
          roles: ['blt9f8e79c6269e5a14'],
        },
        enabled: true,
        deleted_at: false,
      },
    },
  ],
};
