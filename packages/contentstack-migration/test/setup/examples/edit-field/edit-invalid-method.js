
module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.editField('uniqueid')
  .display_nam('Unique Id')
  .mandatory(false)
  migration.addTask(foo.getTaskDefinition())
}