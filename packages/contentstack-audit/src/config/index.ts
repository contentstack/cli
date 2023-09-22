const config = {
  modules: ['content-types', 'global-fields'],
  skipRefs: ['sys_assets'],
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
  },
};

export default config;
