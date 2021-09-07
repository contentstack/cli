module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')

  foo.deleteField('facebook_links')
  migration.addTask(foo.getTaskDefinition())
}
