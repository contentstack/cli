"use strict";

/**
 * Plugin helps to create new entries
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance
 */
module.exports = async ({ migration, stackSDKInstance, config }) => {
  const contentTypeId = "product_teaser";

  const createEntryTask = {
    title: "Create entries",
    successMessage: "Entries added successfully.",
    failedMessage: "Failed to add entries.",
    task: async () => {
      let entry = {
        title: `Apple tag teaser`,
        description: `Apple tag`,
      };
      const entryObj = await stackSDKInstance
        .contentType(contentTypeId)
        .entry()
        .create({ entry });
    },
  };

  migration.addTask(createEntryTask);
};
