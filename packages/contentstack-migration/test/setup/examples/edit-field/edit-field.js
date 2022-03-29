
module.exports = ({migration}) => {
  const foo = migration.editContentType('foo3')
  foo.editField('facebook_link')
  .display_name('Facebook Link')
  .mandatory(false)
  migration.addTask(foo.getTaskDefinition())
}
