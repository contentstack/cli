const fs = require('fs');
const path = require('path');

const logFileDir = 'logs';
const dummyDir = 'test/dummy/';

import { sanitizePath } from '@contentstack/cli-utilities';

if (!fs.existsSync(path.join(__dirname, logFileDir))) {
  fs.mkdirSync(path.join(__dirname, logFileDir));
}

const logs = [
  '1587758242717.bulk-publish-entries.success',
  '1587758242717.publish-entries',
  '1587758242717.publish-entries.success',
  '1587758242717.publishentries.success',
  '1587758242717.publish-entries.txt',
  '1587758242718.bulk-publish-entries.success',
  '1587758242718.publish-entries.success',
  '1587758242719.publish-entries.success',
  '1587956283100.publish-assets.success',
  '1587758242717.bulk-add-fields.error',
  '1587758242717.bulk-cross-publish.error',
  '1587758242717.bulk-nonlocalized-field-changes.error',
  '1587758242717.bulk-publish-assets.error',
  '1587758242717.bulk-publish-draft.error',
  '1587758242717.bulk-publish-edits.error',
  '1587758242717.bulk-publish-entries.error',
  '1587758242717.bulk-unpublish.error',
  '1587758242717.revert.error',
];

logs.forEach((element) => {
  fs.createReadStream(path.join(__dirname, dummyDir, sanitizePath(element))).pipe(fs.createWriteStream(path.join(__dirname, logFileDir, sanitizePath(element))));
});
