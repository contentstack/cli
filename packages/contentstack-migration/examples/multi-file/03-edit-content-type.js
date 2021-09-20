'use strict'

module.exports = async ({migration, stackSDKInstance}) => {
  const blogUID = 'blog'
  const authorUID = 'author'

  const blogEdit = migration.editContentType(blogUID)
  blogEdit.createField('author')
  .data_type('reference')
  .reference_to([authorUID])
  .ref_multiple(false)

  migration.addTask(blogEdit.getTaskDefinition())
}
