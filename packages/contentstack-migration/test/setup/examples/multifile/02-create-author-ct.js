'use strict'

module.exports = async ({migration, stackSDKInstance}) => {
  const authorUID = 'author'
  const authorTitle = 'Author'
  const author = migration.createContentType(authorUID)
  .title(authorTitle)
  .description('Author of a blog')

  author.createField('title')
  .display_name('Title')
  .data_type('text')
  .mandatory(true)
  author.createField('url')
  .display_name('URL')
  .data_type('text')
  .mandatory(true)

  author.createField('firstname')
  .display_name('First Name')
  .data_type('text')
  .mandatory(false)

  author.createField('lastname')
  .display_name('Last Name')
  .data_type('text')
  .mandatory(false)

  migration.addTask(author.getTaskDefinition())
}
