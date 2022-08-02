module.exports = ({ migration, stackSDKInstance }) => {
  // Task 1
  const createContentType = contentTypeUID => {
    return {
      title: `Create content-type '${contentTypeUID}'`,
      successMessage: `Content-type '${contentTypeUID}' created successfully`,
      failedMessage: `Failed to create content-type '${contentTypeUID}'`,
      task: async params => {
        let blogCT
        try {
          blogCT = await stackSDKInstance.contentType(contentTypeUID).fetch()
        } catch (error) {
          console.log((error && error.errorMessage) || ` '${contentTypeUID}' not available`)
        }
        if (!blogCT) {
          try {
            const contentType = stackSDKInstance.contentType()
            const content_type = {
              title: 'Blog Post',
              uid: contentTypeUID,
              schema: [
                {
                  display_name: "Title",
                  uid: "title",
                  data_type: "text",
                  field_metadata: {
                    _default: true
                  },
                  unique: false,
                  mandatory: true,
                  multiple: false
                },
                {
                  display_name: "URL",
                  uid: "url",
                  data_type: "text",
                  field_metadata: {
                    _default: true
                  },
                  unique: false,
                  multiple: false
                }
              ]
            }
            await contentType.create({ content_type })
          } catch (error) {
            console.log((error && error.errorMessage) || ` '${contentTypeUID}' creation failed`)
          }
        }
        for (let index = 0; index < 4; index++) {
          let entry = {
            title: `Awesome Blog ${index}`,
            url: `/awesome-blog-${index}`,
          }
          try {
            await stackSDKInstance.contentType(contentTypeUID).entry().create({ entry })
          } catch (error) {
            console.log((error && error.errorMessage) || ` Entries creation for content-type '${contentTypeUID}' failed`)
          }
        }
      },
    }
  }

  migration.addTask(createContentType('blog_post'))


  // Task 2
  const blogPost = migration.editContentType('blog_post')
  blogPost.createField('archived')
    .display_name('Archived')
    .data_type('boolean')
    .mandatory(false)
  migration.addTask(blogPost.getTaskDefinition())

  // Task 3
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