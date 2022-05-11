"use strict";

/**
 * Plugin helps to update then publish entries
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance
 */
module.exports = async ({ migration, stackSDKInstance }) => {
  const contentTypeUID = "sports-blog";
  const authorUID = "John Doe";
  // Task executes sequentially
  // Task 1 update entries
  const updateEntries = (contentTypeUID) => {
    return {
      title: `Migrate data to new field '${contentTypeUID}'`,
      successMessage: `Migrated data successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to Migrate data for '${contentTypeUID}'`,
      task: async (params) => {
        try {
          let entries = await stackSDKInstance
            .contentType(contentTypeUID)
            .entry()
            .query()
            .find();
          entries = entries.items;
          for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            entry.archived = entry.is_archived;
            await entry.update();
          }
        } catch (error) {
          console.log(error);
        }
      },
    };
  };
  migration.addTask(updateEntries("blog_post"));

  // Task 2 publish entries
  const getPublishEntriesTask = (contentTypeUID) => {
    return {
      title: `Publish entries for Content type '${contentTypeUID}'`,
      successMessage: `Entries published successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to publish entries for '${contentTypeUID}'`,
      task: async (params) => {
        let entries = await stackSDKInstance
          .contentType(contentTypeUID)
          .entry()
          .query()
          .find();
        entries = entries.items;
        for (let index = 0; index < entries.length; index++) {
          const entry = entries[index];
          const publishDetails = {
            locales: ["en-us"],
            environments: ["development"],
          };
          await entry.publish({ publishDetails, locale: "en-us" });
        }
      },
    };
  };

  migration.addTask(getPublishEntriesTask(contentTypeUID));
};
