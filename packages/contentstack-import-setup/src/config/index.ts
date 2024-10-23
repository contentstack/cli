import { entries } from 'lodash';
import { DefaultConfig } from '../types';

const config: DefaultConfig = {
  // use below hosts for eu region
  // host:'https://eu-api.contentstack.com/v3',
  // use below hosts for azure-na region
  // host:'https://azure-na-api.contentstack.com/v3',
  // use below hosts for azure-eu region
  // host:'https://azure-eu-api.contentstack.com/v3',
  // use below hosts for gcp-na region
  // host:'https://gcp-na-api.contentstack.com',
  // pass locale, only to migrate entries from that locale
  // not passing `locale` will migrate all the locales present
  // locales: ['fr-fr'],
  host: 'https://api.contentstack.io/v3',
  modules: {
    'custom-roles': {
      dirName: 'custom-roles',
      fileName: 'custom-roles.json',
      dependencies: ['environments', 'entries'],
    },
    environments: {
      dirName: 'environments',
      fileName: 'environments.json',
    },
    extensions: {
      dirName: 'extensions',
      fileName: 'extensions.json',
    },
    assets: {
      dirName: 'assets',
      fileName: 'assets.json',
    },
    'content-types': {
      dirName: 'content_types',
      fileName: 'content_types.json',
      dependencies: ['extensions', 'taxonomies'],
    },
    entries: {
      dirName: 'entries',
      fileName: 'entries.json',
      dependencies: ['assets', 'environments', 'marketplace-apps', 'taxonomies'],
    },
    'global-fields': {
      dirName: 'global_fields',
      fileName: 'globalfields.json',
      dependencies: ['marketplace-apps'],
    },
    'marketplace-apps': {
      dirName: 'marketplace_apps',
      fileName: 'marketplace_apps.json',
    },
    taxonomies: {
      dirName: 'taxonomies',
      fileName: 'taxonomies.json',
      invalidKeys: [
        'updated_at',
        'created_by',
        'updated_by',
        'stackHeaders',
        'urlPath',
        'created_at',
        'ancestors',
        'update',
        'delete',
        'fetch',
        'descendants',
        'move',
        'search',
      ],
    },
  },
};

export default config;
