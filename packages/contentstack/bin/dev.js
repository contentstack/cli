#!/usr/bin/env node_modules/.bin/ts-node
// eslint-disable-next-line node/shebang, unicorn/prefer-top-level-await
require('dotenv').config({ path: './.env' });
(async () => {
  const oclif = await import('@oclif/core');
  await oclif.execute({ development: true, dir: __dirname });
})();
