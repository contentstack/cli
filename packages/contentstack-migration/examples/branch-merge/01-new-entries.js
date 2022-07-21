"use strict";

/**
 * Plugin helps to create new entries
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance
 */
module.exports = async ({ migration, stackSDKInstance, config }) => {
  const { contentTypeUID } = config;

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
              title: `Blog post 1${Math.random()}`,
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
                  display_name: "Description",
                  uid: "description",
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
      },
    }
  }

  migration.addTask(createContentType(contentTypeUID))

  const createEntryTask = {
    title: "Create entries",
    successMessage: "Entries added successfully.",
    failedMessage: "Failed to add entries.",
    task: async () => {
      let entry = {
        title: `Apple tag teaser 2${Math.random()}`,
        description: `Apple tag 2`,
      };
      const entryObj = await stackSDKInstance
        .contentType(contentTypeUID)
        .entry()
        .create({ entry });
    },
  };

  migration.addTask(createEntryTask);
};
