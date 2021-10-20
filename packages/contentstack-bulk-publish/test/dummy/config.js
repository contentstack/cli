module.exports = {
  apikey: 'tt',
  contentTypes: ['test'],
  apiEndPoint: 'https://api.localhost.com',
  manageToken: 'dummyManageToken',
  cdnEndPoint: 'https://cdn.localhost.com',
  deliveryToken: 'dummydeliveryToken',
  apiVersion: 3,
  publish_unpublished_env: {
    contentTypes: ['dummyContentType'],
    sourceEnv: 'dummyEnvironment',
    locale: 'en-us',
    environments: ['dummyEnvironment'],
    bulkPublish: true,
  },
  publish_assets: {
    environments: ['dummyEnvironment'],
    folderUid: 'cs_root', // uid of the folder whose contents needs to be published, cs_root for every asset of the stack
    bulkPublish: false,
  },
  publish_entries: {
    contentTypes: ['dummyContentType'],
    locales: ['en-us'],
    environments: ['dummyEnvironment'],
    publishAllContentTypes: true,
    bulkPublish: false,
  },
  cross_env_publish: {
    filter: {
      environment: 'dummyEnvironment', // source environment
      content_type_uid: 'dummyContentType', // contentType filters
      locale: 'en-us', // locale filters
      type: 'asset_published,entry_published',
    },
    deliveryToken: 'dummyDeliveryToken', // deliveryToken of the source environment
    destEnv: ['dummyEnvironment1'], // environment where it needs to be published
    bulkPublish: true,
  },
  publish_edits_on_env: {
    contentTypes: ['dummyContentType'],
    sourceEnv: 'dummyEnvironment',
    environments: ['dummyEnvironment'],
    locales: ['en-us'],
    bulkPublish: false,
  },
  nonlocalized_field_changes: {
    sourceEnv: 'dummyEnvironment', // source Environment
    contentTypes: ['helloworld'],
    environments: ['dummyEnvironment'], // publishing Environments
    bulkPublish: false,
  },
  addFields: {
    deleteFields: ['updated_by', 'created_by', 'created_at', 'updated_at', '_version', 'ACL'],
    locales: ['en-us'],
    contentTypes: ['helloworld'],
    environments: ['dummyEnvironment'],
    defaults: {
      number: null,
      boolean: false,
      isodate: [],
      file: null,
      reference: [],
    },
    bulkPublish: true,
  },
  Unpublish: {
    filter: {
      environment: 'dummyEnvironment', // source environment
      content_type_uid: 'dummyContentType', // contentType filters
      locale: 'en-us', // locale filters
      type: 'asset_published,entry_published',
    },
    deliveryToken: 'dummyDeliveryToken', // deliveryToken of the environment
    bulkUnpublish: true,
  },
};
