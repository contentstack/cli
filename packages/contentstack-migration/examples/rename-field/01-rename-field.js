module.exports = ({migration}) => {
  // Task 1
  const blogPost = migration.editContentType('blog_post')
  blogPost.createField('archived')
  .display_name('Archived')
  .data_type('boolean')
  .mandatory(false)
  migration.addTask(blogPost.getTaskDefinition())

  // Task 2
  const updateEntries = contentTypeUID => {
    return {
      title: `Migrate data to new field '${contentTypeUID}'`,
      successMessage: `Migrated data successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to Migrate data for '${contentTypeUID}'`,
      task: async params => {
        try {
          let entries = await stackSDKInstance.contentType(contentTypeUID).entry().query().find()
          entries = entries.items
          for (let index = 0; index < entries.length; index++) {
            const entry = entries[index]
            entry.archived = entry.is_archived;
            await entry.update()
          }
        } catch (error) {
          console.log(error)
        }
      },
    }
  }
  migration.addTask(updateEntries('blog_post'))
}