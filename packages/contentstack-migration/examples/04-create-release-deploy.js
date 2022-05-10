/* eslint-disable camelcase */

module.exports = async ({migration, stackSDKInstance}) => {
  let releaseObj = ''
  const createReleaseTask = () => {
    return {
      title: 'Create release',
      successMessage: 'Created release',
      failedMessage: 'Failed to deploy release',
      task: async () => {
        try {
          const release = {
            name: 'Release Name4',
            description: '2018-12-12',
            locked: false,
            archived: false,
          }
          releaseObj = await stackSDKInstance.release().create({release})
        } catch (error) {
          throw error
        }
      },
    }
  }
  const addToReleaseTask = contentTypeUID => {
    return {
      title: `Add entries to release for Content type '${contentTypeUID}'`,
      successMessage: `Entries added to release successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to add entries to release for '${contentTypeUID}'`,
      task: async params => {
        const items = []
        try {
          let entries = await stackSDKInstance.contentType(contentTypeUID).entry().query().find()
          entries = entries.items
          for (let index = 0; index < entries.length; index++) {
            const entry = entries[index]
            items.push({
              uid: entry.uid,
              version: entry._version,
              locale: entry.locale,
              content_type_uid: entry.content_type_uid,
              action: 'publish',
            })
          }
          await stackSDKInstance.release(releaseObj.uid).item().create({items})
        } catch (error) {
          throw error
        }
      },
    }
  }

  const deployReleaseTask = () => {
    return {
      title: 'Deploy release',
      successMessage: 'Deployed release',
      failedMessage: 'Failed to deploy release',
      task: async () => {
        try {
          const publishDetails = {
            locales: [
              'en-us',
            ],
            environments: [
              'development',
            ],
            action: 'publish',
          }
          await stackSDKInstance.release(releaseObj.uid).deploy(publishDetails)
        } catch (error) {
          throw error
        }
      },
    }
  }
  const blogUID = 'blog6'
  const authorUID = 'author6'
  migration.addTask(createReleaseTask())
  migration.addTask(addToReleaseTask(blogUID))
  migration.addTask(addToReleaseTask(authorUID))
  migration.addTask(deployReleaseTask())
}
