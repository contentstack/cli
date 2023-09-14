const config = {
  modules: ['content-types', 'entries', 'global-fields'],
  skipRefs: ['sys_assets'],
  moduleConfig: {
    'content-types': {
      dirName: 'content_types',
      fileName: 'content_types.json',
    },
  },
};

export default config;
