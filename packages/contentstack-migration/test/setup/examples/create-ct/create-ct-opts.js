'use strict'

module.exports = async ({migration}) => {
  const foo = migration.createContentType('foo3', {
    title: 'foo3',
    description: 'sample description',
  })

  foo.createField('title')
  .display_name('Title')
  .data_type('text')
  .mandatory(true)

  foo.createField('url')
  .display_name('URL')
  .data_type('text')
  .mandatory(true)

  migration.addTask(foo.getTaskDefinition())
}
