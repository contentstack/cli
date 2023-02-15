const { test } = require('@oclif/test');
const { cliux, managementSDKClient } = require('@contentstack/cli-utilities');
const _ = require('lodash');

test
  .stub(managementSDKClient(), 'Client', (e) => {
    return {
      stack: function () {
        return {
          locale: function () {
            return {
              create: function () {
                return new Promise.resolve('ncjkdncjdncjd');
              },
            };
          },
        };
      },
      users: function () {
        return new Promise.resolve();
      },
    };
  })
  .stub(cliux, 'prompt', (_name) => async (name) => {
    if (name === 'Please provide master locale ?') return 'en-us';
    if (name === 'Please provide target Stack') return 'newstackUid';
    if (name === 'Please provide path were you have stored the data')
      return '/home/rohit/Import-Export-script/contentstack-export/SYNcontents/';
  })
  .command(['cm:import', '--auth-token', '-m', 'locales'])
  .it('runs method of Locales', (ctx) => {});
