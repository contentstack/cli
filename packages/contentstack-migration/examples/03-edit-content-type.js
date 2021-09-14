module.exports = ({migration}) => {
  const foo = migration.editContentType('author6')

  foo.createField('facebook_link')
  .display_name('facebook')
  .data_type('text')
  .mandatory(true)

  foo.createField('twitter_link')
  .display_name('Twitter')
  .data_type('text')
  .mandatory(true)
  migration.addTask(foo.getTaskDefinition())
}
