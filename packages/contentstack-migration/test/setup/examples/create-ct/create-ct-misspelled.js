'use strict';

module.exports = async ({ migration }) => {
  const foo = migration.createContentType('foo').title('foo').description('Sample description');

  foo.createField('title').display_name('Title').data_tyep('text').mandatory(true);

  migration.addTask(foo.getTaskDefinition());
};
