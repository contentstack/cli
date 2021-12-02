"use strict";

module.exports = async ({ migration, stackSDKInstance }) => {
  const contenttypeId = "product_teaser";

  /**
   * add entries
   */
  let createEntryTask = {
    title: "Create entries",
    successMessage: "Entries added successfully.",
    failedMessage: "Failed to add entries.",
    task: async () => {
      try {
        let entry = {
          title: `Apple tag teaser`,
          description: `Apple tag`,
        };
        let entryObj = await stackSDKInstance
          .contentType(contenttypeId)
          .entry()
          .create({ entry });
      } catch (error) {
        console.log(error);
      }
    },
  };

  migration.addTask(createEntryTask);
};
