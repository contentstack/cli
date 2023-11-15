const config = {
  showTerminalOutput: true,
  skipRefs: ['sys_assets'],
  modules: ['content-types', 'global-fields', 'entries'],
  'fix-fields': ['reference', 'global_field', 'json:rte', 'json:custom-field', 'blocks', 'group'],
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
};

export default config;
