const config = {
  showTerminalOutput: true,
  skipRefs: ['sys_assets'],
  skipFieldTypes: ['taxonomy'],
  modules: ['content-types', 'global-fields', 'entries'],
  'fix-fields': ['reference', 'global_field', 'json:rte', 'json:extension', 'blocks', 'group'],
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
};

export default config;
