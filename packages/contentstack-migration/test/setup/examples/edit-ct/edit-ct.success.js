'use strict'

module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')
  foo.description('Edited description')
  foo.isPage(false)

  foo.createField('facebook_link')
  .display_name('facebook')
  .data_type('link')
  .mandatory(true)

  migration.addTask(foo.getTaskDefinition())
}

