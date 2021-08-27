'use strict'

module.exports = async ({migration, stackSDKInstance}) => {
  const blogUID = 'blog3'
  const authorUID = 'author3'

  const blogEdit = migration.editContentType(blogUID)
  blogEdit.createField('author')
  .data_type('reference')
  .reference_to([authorUID])
  .ref_multiple(false)

  migration.addTask(blogEdit.getTaskDefinition())
}
