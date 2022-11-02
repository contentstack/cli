'use strict'

module.exports = async ({migration, stackSDKInstance}) => {
  const blogUID = 'blog'
  const blogTitle = 'Blog'

  /**
   * Create Blog content type
   */
  const blog = migration.createContentType(blogUID)
  .title(blogTitle)
  .description('Awesome blogs here')

  blog.createField('title')
  .display_name('Title')
  .data_type('text')
  .mandatory(true)

  blog.createField('url')
  .display_name('URL')
  .data_type('text')
  .mandatory(true)

  blog.createField('author_name')
  .display_name('Author Name')
  .data_type('text')
  .mandatory(true)

  migration.addTask(blog.getTaskDefinition())

  /**
   * add entries to blog content type
   */
  let entries = []
  let myCustomTask = {
    title: 'Create blog entries',
    successMessage: 'Blog entries added successfully.',
    failedMessage: 'Failed to add Blog entries.',
    tasks: async () => {
      for (let index = 0; index < 4; index++) {
        let entry = {
          title: `Awesome Blog ${index}`,
          url: `/awesome-log-${index}`,
          body: `This is ${index} blog.`,
          author_name: `Firstname-${index} Lastname-${index}`,
        }
        // eslint-disable-next-line no-await-in-loop
        let entryObj = await stackSDKInstance.contentType(blogUID).entry().create({entry})
        entries.push(entryObj)
      }
    },
    paramsToBind: entries,
  }

  migration.addTask(myCustomTask)
}
