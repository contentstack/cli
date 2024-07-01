import * as config from '../../config.json';

const mockData = {
  findOneData: {},
  countData: { assets: 5 },
  findData: {
    items: [
      {
        stackHeaders: { api_key: config.apiKey },
        urlPath: '/assets/scd',
        uid: 'hbjdjcy83kjxc',
        content_type: 'image/jpeg',
        file_size: '4278651',
        tags: [],
        filename: 'pexels-arthouse-studio-4534200.jpeg',
        url: 'test-url-1',
        _version: 1,
      },
      {
        stackHeaders: { api_key: config.apiKey },
        urlPath: '/assets/scd',
        uid: 'hbjdjcy83kjxc',
        content_type: 'image/jpeg',
        file_size: '4278651',
        tags: [],
        filename: 'pexels-arthouse-studio-4534200.jpeg',
        url: 'test-url-1',
        _version: 2,
      },
      {
        stackHeaders: { api_key: config.apiKey },
        urlPath: '/assets/scd',
        uid: 'hbjdjcy83kjxc',
        content_type: 'image/jpeg',
        file_size: '4278651',
        tags: [],
        filename: 'pexels-arthouse-studio-4534200.jpeg',
        url: 'test-url-1',
        _version: 3,
      },
      {
        stackHeaders: { api_key: '3242e' },
        urlPath: '/assets/scd',
        uid: 'hbjdjcy83kjxc',
        content_type: 'image/jpeg',
        file_size: '4278651',
        tags: [],
        filename: 'pexels-arthouse-studio-4534200.jpeg',
        url: 'test-url-2',
        _version: 1,
      },
      {
        stackHeaders: { api_key: 'ert' },
        urlPath: '/assets/scd',
        uid: 'hbjdjcy83kjxc',
        content_type: 'image/jpeg',
        file_size: '427fg435f8651',
        tags: [],
        filename: 'pexels-arthouse-studio-4534200.jpeg',
        url: 'test-url-3',
        _version: 1,
      },
    ],
  },
};

const versionedAssets = [{ 'ABC-1': 2 }, { 'ABC-2': 3 }, { 'ABC-3': 4 }, { 'ABC-4': 2 }];
const assetsMetaData = {
  'file-1': [
    {
      uid: 'yhuj3',
      url: 'https://test.io/assets/efsf/pexels-andy-vu-3244513.jpeg',
      filename: 'pexels-andy-vu-3244513.jpeg',
    },
    {
      uid: '4234',
      filename: 'pexels-jonas-kakaroto-736230.jpeg',
      url: 'https://test.io/assets/efsf/pexels-jonas-kakaroto-736230.jpeg',
    },
    {
      uid: 'fwer',
      url: 'https://test.io/assets/efsf/pexels-dominika-roseclay-1166869.jpeg',
      filename: 'pexels-dominika-roseclay-1166869.jpeg',
    },
  ],
};

export { mockData, versionedAssets, assetsMetaData };
