/* eslint-disable camelcase */

module.exports = async ({migration, stackSDKInstance}) => {
  const getPublishEntriesTask = contentTypeUID => {
    return {
      title: `Publish entries for Content type '${contentTypeUID}'`,
      successMessage: `Entries published successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to publish entries for '${contentTypeUID}'`,
      task: async params => {
        try {
          let entries = await stackSDKInstance.contentType(contentTypeUID).entry().query().find()
          entries = entries.items
          for (let index = 0; index < entries.length; index++) {
            const entry = entries[index]
            const publishDetails = {
              locales: [
                'en-us',
              ],
              environments: [
                'development',
              ],
            }
            entry.publish({publishDetails, locale: 'en-us'})
          }
        } catch (error) {
          console.log(error)
        }
      },
    }
  }
  const blogUID = 'blog6'
  const authorUID = 'author6'
  migration.addTask(getPublishEntriesTask(blogUID))
  migration.addTask(getPublishEntriesTask(authorUID))
}
