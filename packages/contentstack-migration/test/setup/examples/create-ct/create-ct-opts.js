'use strict';

module.exports = async ({ migration, stackSDKInstance }) => {
  console.log('>>>>>>>>>.qq')
  const foo = migration.createContentType('foo3', {
    title: 'foo3',
    description: 'sample description'
  });

  console.log('>>>>>>>>>.10')
  foo.createField('title')
    .display_name('Title')
    .data_type('text')
    .mandatory(true);

    console.log('>>>>>>>>>.16')
  foo.createField('url')
    .display_name('URL')
    .data_type('text')
    .mandatory(true);
    console.log('>>>>>>>>>.17')
  migration.addTask(foo.getTaskDefinition())
  console.log('>>>>>>>>>.pp')
};
