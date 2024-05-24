import { DefaultConfig } from '../types';

const config: DefaultConfig = {
  contentVersion: 2,
  versioning: false,
  host: 'https://api.contentstack.io/v3',
  developerHubUrls: {
    // NOTE CDA url used as developer-hub url mapper to avoid conflict if user used any custom name
    'https://api.contentstack.io': 'https://developerhub-api.contentstack.com',
    'https://eu-api.contentstack.com': 'https://eu-developerhub-api.contentstack.com',
    'https://azure-na-api.contentstack.com': 'https://azure-na-developerhub-api.contentstack.com',
    'https://azure-eu-api.contentstack.com': 'https://azure-eu-developerhub-api.contentstack.com',
    'https://gcp-na-api.contentstack.com': 'https://gcp-na-developerhub-api.contentstack.com',
  },
  // use below hosts for eu region
  // host:'https://eu-api.contentstack.com/v3',
  // use below hosts for azure-na region
  // host:'https://azure-na-api.contentstack.com/v3',
  // use below hosts for azure-eu region
  // host:'https://azure-eu-api.contentstack.com/v3',
  // use below hosts for gcp-na region
  // host: 'https://gcp-na-api.contentstack.com'
  modules: {
    types: [
      'stack',
      'assets',
      'locales',
      'environments',
      'extensions',
      'webhooks',
      'taxonomies',
      'global-fields',
      'content-types',
      'custom-roles',
      'workflows',
      'entries',
      'labels',
      'marketplace-apps',
      'personalization',
    ],
    locales: {
      dirName: 'locales',
      fileName: 'locales.json',
      requiredKeys: ['code', 'uid', 'name', 'fallback_locale'],
    },
    masterLocale: {
      dirName: 'locales',
      fileName: 'master-locale.json',
      requiredKeys: ['code', 'uid', 'name'],
    },
    customRoles: {
      dirName: 'custom-roles',
      fileName: 'custom-roles.json',
      customRolesLocalesFileName: 'custom-roles-locales.json',
    },
    'custom-roles': {
      dirName: 'custom-roles',
      fileName: 'custom-roles.json',
      customRolesLocalesFileName: 'custom-roles-locales.json',
    },
    environments: {
      dirName: 'environments',
      fileName: 'environments.json',
    },
    labels: {
      dirName: 'labels',
      fileName: 'labels.json',
      invalidKeys: ['stackHeaders', 'urlPath', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    },
    webhooks: {
      dirName: 'webhooks',
      fileName: 'webhooks.json',
    },
    releases: {
      dirName: 'releases',
      fileName: 'releases.json',
      releasesList: 'releasesList.json',
      invalidKeys: ['stackHeaders', 'urlPath', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    },
    workflows: {
      dirName: 'workflows',
      fileName: 'workflows.json',
      invalidKeys: ['stackHeaders', 'urlPath', 'created_at', 'updated_at', 'created_by', 'updated_by'],
    },
    globalfields: {
      dirName: 'global_fields',
      fileName: 'globalfields.json',
      validKeys: ['title', 'uid', 'schema', 'options', 'singleton', 'description'],
    },
    'global-fields': {
      dirName: 'global_fields',
      fileName: 'globalfields.json',
      validKeys: ['title', 'uid', 'schema', 'options', 'singleton', 'description'],
    },
    assets: {
      dirName: 'assets',
      fileName: 'assets.json',
      // This is the total no. of asset objects fetched in each 'get assets' call
      batchLimit: 20,
      host: 'https://images.contentstack.io',
      invalidKeys: ['created_at', 'updated_at', 'created_by', 'updated_by', '_metadata', 'published'],
      // no of asset version files (of a single asset) that'll be downloaded parallel
      chunkFileSize: 1, // measured on Megabits (5mb)
      downloadLimit: 5,
      fetchConcurrency: 5,
      assetsMetaKeys: [], // Default keys ['uid', 'url', 'filename']
      securedAssets: false,
      displayExecutionTime: false,
      enableDownloadStatus: false,
      includeVersionedAssets: false,
    },
    content_types: {
      dirName: 'content_types',
      fileName: 'content_types.json',
      validKeys: ['title', 'uid', 'field_rules', 'schema', 'options', 'singleton', 'description'],
      // total no of content types fetched in each 'get content types' call
      limit: 100,
    },
    'content-types': {
      dirName: 'content_types',
      fileName: 'content_types.json',
      validKeys: ['title', 'uid', 'field_rules', 'schema', 'options', 'singleton', 'description'],
      // total no of content types fetched in each 'get content types' call
      limit: 100,
    },
    entries: {
      dirName: 'entries',
      fileName: 'entries.json',
      invalidKeys: [
        'stackHeaders',
        'content_type_uid',
        'urlPath',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        '_metadata',
        'published',
      ],
      batchLimit: 20,
      downloadLimit: 5,
      // total no of entries fetched in each content type in a single call
      limit: 100,
      dependencies: ['locales', 'content-types'],
      exportVersions: false,
    },
    personalization: {
      baseURL: {
        dev11: 'https://dev-personalization-api.csnonprod.com',
      },
      dirName: 'personalization',
      exportOrder: ['attributes', 'audiences', 'events', 'experiences'],
      projects: {
        dirName: 'projects',
        fileName: 'projects.json',
      },
      attributes: {
        dirName: 'attributes',
        fileName: 'attributes.json',
      },
      audiences: {
        dirName: 'audiences',
        fileName: 'audiences.json',
      },
      events: {
        dirName: 'events',
        fileName: 'events.json',
      },
      experiences: {
        dirName: 'experiences',
        fileName: 'experiences.json',
      },
    },
    variantEntry: {
      serveMockData: false,
      dirName: 'variants',
      fileName: 'index.json',
      chunkFileSize: 1,
      query: {
        skip: 0,
        limit: 100,
        include_variant: false,
        include_count: true,
        include_publish_details: true,
      },
      mockDataPath: './variant-mock-data.json',
    },
    extensions: {
      dirName: 'extensions',
      fileName: 'extensions.json',
    },
    stack: {
      dirName: 'stack',
      fileName: 'stack.json',
    },
    dependency: {
      entries: ['stack', 'locales', 'content-types'],
    },
    marketplace_apps: {
      dirName: 'marketplace_apps',
      fileName: 'marketplace_apps.json',
    },
    'marketplace-apps': {
      dirName: 'marketplace_apps',
      fileName: 'marketplace_apps.json',
    },
    taxonomies: {
      dirName: 'taxonomies',
      fileName: 'taxonomies.json',
      invalidKeys: ['updated_at', 'created_by', 'updated_by', 'stackHeaders', 'urlPath', 'created_at'],
    },
    events: {
      dirName: 'events',
      fileName: 'events.json',
      invalidKeys: [
        'updatedAt',
        'createdBy',
        'updatedBy',
        '_id',
        'createdAt',
        'createdByUserName',
        'updatedByUserName',
      ],
    },
    audiences: {
      dirName: 'audiences',
      fileName: 'audiences.json',
      invalidKeys: [
        'updatedAt',
        'createdBy',
        'updatedBy',
        '_id',
        'createdAt',
        'createdByUserName',
        'updatedByUserName',
      ],
    },
    attributes: {
      dirName: 'attributes',
      fileName: 'attributes.json',
      invalidKeys: [
        'updatedAt',
        'createdBy',
        'updatedBy',
        '_id',
        'createdAt',
        'createdByUserName',
        'updatedByUserName',
      ],
    },
  },
  languagesCode: [
    'af-za',
    'sq-al',
    'ar',
    'ar-dz',
    'ar-bh',
    'ar-eg',
    'ar-iq',
    'ar-jo',
    'ar-kw',
    'ar-lb',
    'ar-ly',
    'ar-ma',
    'ar-om',
    'ar-qa',
    'ar-sa',
    'ar-sy',
    'ar-tn',
    'ar-ae',
    'ar-ye',
    'hy-am',
    'az',
    'cy-az-az',
    'lt-az-az',
    'eu-es',
    'be-by',
    'bs',
    'bg-bg',
    'ca-es',
    'zh',
    'zh-au',
    'zh-cn',
    'zh-hk',
    'zh-mo',
    'zh-my',
    'zh-sg',
    'zh-tw',
    'zh-chs',
    'zh-cht',
    'hr-hr',
    'cs',
    'cs-cz',
    'da-dk',
    'div-mv',
    'nl',
    'nl-be',
    'nl-nl',
    'en',
    'en-au',
    'en-at',
    'en-be',
    'en-bz',
    'en-ca',
    'en-cb',
    'en-cn',
    'en-cz',
    'en-dk',
    'en-do',
    'en-ee',
    'en-fi',
    'en-fr',
    'en-de',
    'en-gr',
    'en-hk',
    'en-hu',
    'en-in',
    'en-id',
    'en-ie',
    'en-it',
    'en-jm',
    'en-jp',
    'en-kr',
    'en-lv',
    'en-lt',
    'en-lu',
    'en-my',
    'en-mx',
    'en-nz',
    'en-no',
    'en-ph',
    'en-pl',
    'en-pt',
    'en-pr',
    'en-ru',
    'en-sg',
    'en-sk',
    'en-si',
    'en-za',
    'en-es',
    'en-se',
    'en-ch',
    'en-th',
    'en-nl',
    'en-tt',
    'en-gb',
    'en-us',
    'en-zw',
    'et-ee',
    'fo-fo',
    'fa-ir',
    'fi',
    'fi-fi',
    'fr',
    'fr-be',
    'fr-ca',
    'fr-fr',
    'fr-lu',
    'fr-mc',
    'fr-ch',
    'fr-us',
    'gd',
    'gl-es',
    'ka-ge',
    'de',
    'de-at',
    'de-de',
    'de-li',
    'de-lu',
    'de-ch',
    'el-gr',
    'gu-in',
    'he-il',
    'hi-in',
    'hu-hu',
    'is-is',
    'id-id',
    'it',
    'it-it',
    'it-ch',
    'ja',
    'ja-jp',
    'kn-in',
    'kk-kz',
    'km-kh',
    'kok-in',
    'ko',
    'ko-kr',
    'ky-kz',
    'lv-lv',
    'lt-lt',
    'mk-mk',
    'ms',
    'ms-bn',
    'ms-my',
    'ms-sg',
    'mt',
    'mr-in',
    'mn-mn',
    'no',
    'no-no',
    'nb-no',
    'nn-no',
    'pl-pl',
    'pt',
    'pt-br',
    'pt-pt',
    'pa-in',
    'ro-ro',
    'ru',
    'ru-kz',
    'ru-ru',
    'ru-ua',
    'sa-in',
    'cy-sr-sp',
    'lt-sr-sp',
    'sr-me',
    'sk-sk',
    'sl-si',
    'es',
    'es-ar',
    'es-bo',
    'es-cl',
    'es-co',
    'es-cr',
    'es-do',
    'es-ec',
    'es-sv',
    'es-gt',
    'es-hn',
    'es-419',
    'es-mx',
    'es-ni',
    'es-pa',
    'es-py',
    'es-pe',
    'es-pr',
    'es-es',
    'es-us',
    'es-uy',
    'es-ve',
    'sw-ke',
    'sv',
    'sv-fi',
    'sv-se',
    'syr-sy',
    'tl',
    'ta-in',
    'tt-ru',
    'te-in',
    'th-th',
    'tr-tr',
    'uk-ua',
    'ur-pk',
    'uz',
    'cy-uz-uz',
    'lt-uz-uz',
    'vi-vn',
    'xh',
    'zu',
  ],
  apis: {
    userSession: '/user-session/',
    globalfields: '/global_fields/',
    locales: '/locales/',
    labels: '/labels/',
    environments: '/environments/',
    assets: '/assets/',
    content_types: '/content_types/',
    entries: '/entries/',
    users: '/stacks',
    extension: '/extensions',
    webhooks: '/webhooks/',
    stacks: '/stacks/',
  },
  preserveStackVersion: false,
  personalizationEnabled: true,
  fetchConcurrency: 5,
  writeConcurrency: 5,
  developerHubBaseUrl: '',
  marketplaceAppEncryptionKey: 'nF2ejRQcTv',
  onlyTSModules: ['taxonomies'],
};

export default config;
