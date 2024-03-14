'use strict'

module.exports = ({migration}) => {
  const foo = migration.createContentType('foo')
  .title('foo')
  .description('Sample description')

  foo.createField('bar')
  .display_name('bar')
  .data_type('text')
  .mandatory(true)

  migration.addTask(foo.getTaskDefinition())

}
