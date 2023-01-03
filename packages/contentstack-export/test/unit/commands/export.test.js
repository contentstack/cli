const { expect, test, it } = require('@oclif/test');
const { cliux, managementSDKClient } = require('@contentstack/cli-utilities');
let defaultConfig = require('../../../src/config/default');
let _ = require('lodash');
var environmentsMock = require('../mock/environment');
var extensionsMock = require('../mock/extensions');
var localeMock = require('../mock/locales');
var workflowMock = require('../mock/workflow');
var globalFieldsMock = require('../mock/globalFields');
var webhooksMock = require('../mock/webhook');
var assetsMock = require('../mock/assets');
var assetFetchMock = require('../mock/assetFetch');
var entriesMock = require('../mock/entries');
var entriesFetchMock = require('../mock/entryFetch');
var contentTypeMock = require('../mock/content-types');
let message = require('../../../messages/index.json');

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          locale: function () {
            return {
              query: function () {
                return {
                  find: function () {
                    return Promise.resolve(workflowMock);
                  },
                };
              },
            };
          },
        };
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === message.promptMessageList.promptMasterLocale) return 'en-us';
    if (name === message.promptMessageList.promptSourceStack) return 'newstackUid';
    if (name === message.promptMessageList.promptPathStoredData) return '../contents';
  })
  .command(['cm:export', '--auth-token', '-m', 'locales'])
  .it('runs method of Locales', (ctx) => {});

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          workflow: function () {
            // return {
            // query: function () {
            return {
              findAll: function () {
                return Promise.resolve(localeMock);
              },
            };
            // },
            // }
          },
        };
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === message.promptMessageList.promptMasterLocale) return 'en-us';
    if (name === message.promptMessageList.promptSourceStack) return 'newstackUid';
    if (name === message.promptMessageList.promptPathStoredData) return '../contents';
  })
  .command(['cm:export', '--auth-token', '-m', 'workflows'])
  .it('runs method of workflows', (ctx) => {});

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          contentType: function () {
            return {
              query: function () {
                return {
                  find: function () {
                    return Promise.resolve(contentTypeMock);
                  },
                };
              },
            };
          },
        };
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === message.promptMessageList.promptMasterLocale) return 'en-us';
    if (name === message.promptMessageList.promptSourceStack) return 'newstackUid';
    if (name === message.promptMessageList.promptPathStoredData) return '../contents';
  })
  .command(['cm:export', '--auth-token', '-m', 'content-types'])
  .it('runs method of ContentTypes', (ctx) => {});

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          contentType: function () {
            return {
              entry: function () {
                return {
                  query: function () {
                    return {
                      find: function () {
                        return Promise.resolve(entriesMock);
                      },
                    };
                  },
                  fetch: function () {
                    return Promise.resolve(entriesFetchMock);
                  },
                };
              },
            };
          },
        };
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === message.promptMessageList.promptSourceStack) return 'newstackUid';
    if (name === message.promptMessageList.promptPathStoredData) return '../contents-test';
  })
  .command(['cm:export', '--auth-token', '-m', 'entries'])
  .it('runs method of environment', (ctx) => {});

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          contentType: function () {
            return {
              entry: function () {
                return {
                  query: function () {
                    return {
                      find: function () {
                        return Promise.resolve(entriesMock);
                      },
                    };
                  },
                  fetch: function () {
                    return Promise.resolve(entriesFetchMock);
                  },
                };
              },
            };
          },
        };
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === message.promptMessageList.promptMasterLocale) return 'en-us';
    if (name === message.promptMessageList.promptSourceStack) return 'newstackUid';
    if (name === message.promptMessageList.promptPathStoredData) return '../contents';
  })
  .command(['cm:export', '--auth-token', '-m', 'entries', '-t', 'author'])
  .it('Export entry of a specific type');
