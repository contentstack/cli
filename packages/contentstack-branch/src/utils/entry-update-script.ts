module.exports = async ({ migration, stackSDKInstance }) => {
  const contentTypeUID = 'blog6';
  const baseBranch = 'master';

  const updateEntries = (contentTypeUID, baseBranch) => {
    return {
      title: `Migrate data to new field '${contentTypeUID}'`,
      successMessage: `Migrated data successfully for '${contentTypeUID}'`,
      failedMessage: `Failed to Migrate data for '${contentTypeUID}'`,
      task: async (params) => {
        try {
          let entries = await stackSDKInstance.branch(baseBranch).contentType(contentTypeUID).entry().query().find();
          entries = entries.items;
          for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            entry.title = 'My New Entry';
            await entry.update();
          }
        } catch (error) {
          console.log(error);
        }
      },
    };
  };

  migration.addTask(updateEntries(contentTypeUID, baseBranch));
};
