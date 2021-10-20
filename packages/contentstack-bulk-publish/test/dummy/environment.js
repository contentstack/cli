module.exports = {
  name: 'production',
  servers: [
    {
      name: 'default',
    },
  ],
  urls: [
    {
      locale: 'en-us',
      url: 'http://example.com/',
    },
  ],
  deploy_content: 'true',
  uid: 'dummyEnvironment',
};
