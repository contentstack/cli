"use strict";

/**
 * Plugin helps to create new entries
 * @param {Object} migration helps to add the tasks to migration
 * @param {Object} stackSDKInstance
 */
module.exports = async ({ migration, stackSDKInstance, config }) => {
  const { contentTypeId } = config;

  const createEntryTask = {
    title: "Create entries",
    successMessage: "Entries added successfully.",
    failedMessage: "Failed to add entries.",
    task: async () => {
      let entry = {
        title: `Apple tag teaser 2`,
        description: `Apple tag 2`,
      };
      const entryObj = await stackSDKInstance
        .contentType(contentTypeId)
        .entry()
        .create({ entry });
    },
  };

  migration.addTask(createEntryTask);
};
