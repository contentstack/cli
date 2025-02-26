const config = {
  showTerminalOutput: true,
  skipRefs: ['sys_assets'],
  skipFieldTypes: ['taxonomy', 'group'],
  modules: ['content-types', 'global-fields', 'entries', 'extensions', 'workflows', 'custom-roles', 'assets'],
  'fix-fields': ['reference', 'global_field', 'json:rte', 'json:extension', 'blocks', 'group', 'content_types'],
  moduleConfig: {
    'content-types': {
      name: 'content type',
      fileName: 'schema.json',
      dirName: 'content_types',
    },
    'global-fields': {
      name: 'global field',
      dirName: 'global_fields',
      fileName: 'globalfields.json',
    },
    entries: {
      name: 'entries',
      dirName: 'entries',
      fileName: 'entries.json',
    },
    locales: {
      name: 'locales',
      dirName: 'locales',
      fileName: 'locales.json',
    },
    workflows: {
      name: 'workflows',
      dirName: 'workflows',
      fileName: 'workflows.json',
    },
    extensions: {
      name: 'extensions',
      dirName: 'extensions',
      fileName: 'extensions.json',
    },
    'custom-roles': {
      name: 'custom-roles',
      dirName: 'custom-roles',
      fileName: 'custom-roles.json',
    },
    'assets': {
      name: 'assets',
      dirName: 'assets',
      fileName: 'assets.json',
    },
    'environments': {
      name: 'environments',
      dirName: 'environments',
      fileName: 'environments.json',
    }
  },
  entries: {
    systemKeys: [
      'uid',
      'ACL',
      'tags',
      'locale',
      '_version',
      '_metadata',
      'published',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by',
      '_in_progress',
      '_restore_status',
      'publish_details',
    ],
  },
  //These keys will be used output the modules with issues and fixes on console
  OutputTableKeys: [
    'title',
    'name',
    'uid',
    'content_types',
    'branches',
    'fixStatus',
    'tree',
    'display_name',
    'display_type',
    'missingRefs',
    'treeStr',
    'missingCTSelectFieldValues',
    'min_instance',
    'missingFieldUid',
    'isPublished',
    'locale',
    'environment',
    'ctUid',
    'ctLocale'
  ],
  ReportTitleForEntries: {
    Entries_Select_feild: 'Entries_Select_feild',
    Entries_Mandatory_feild: 'Entries_Mandatory_feild',
    Entries_Title_feild: 'Entries_Title_feild',
    Entry_Missing_Locale_and_Env: 'Entry_Missing_Locale_and_Env'
  },
  feild_level_modules: ['Entries_Title_feild', 'Entries_Mandatory_feild', 'Entries_Select_feild', 'Entry_Missing_Locale_and_Env'],
};

export default config;
