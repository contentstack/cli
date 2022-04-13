'use strict';

module.exports = async ({ migration, stackSDKInstance }) => {
  const foo = migration.createContentType('foo', {
    title: 'foo',
    deshcripshion: 'sample desc',
  });
  migration.addTask(foo.getTaskDefinition());
};
