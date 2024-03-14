module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.editField('_uniqueid')
  .display_name('Unique Id')

  migration.addTask(foo.getTaskDefinition())
}

