module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const keysToRemove = [
    'stackHeaders',
    'single_line',
    'tags',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
    'ACL',
    '_version',
    'update',
    'delete',
    'fetch',
    'publish',
    'unpublish',
    'publishRequest',
    'setWorkflowStage',
    'import',
    '_in_progress',
    'locale',
  ];

  let comparebranch = '';

  if (config.compare_branch) {
    comparebranch = config.compare_branch;
  }

  const compareBranchEntries = await managementAPIClient
    .stack({ api_key: stackSDKInstance.api_key, branch_uid: comparebranch }) //
    .contentType('banner')
    .entry()
    .query()
    .find();

  const compareFilteredProperties = compareBranchEntries.items.map((entry) => {
    keysToRemove.map((key) => delete entry[key]);
    return entry;
  });

  const createEntryTask = (params) => {
    return {
      title: 'Create Entries',
      successMessage: 'Entries Created Successfully',
      failedMessage: 'Failed to create entries',
      task: async (params) => {
        try {
          compareFilteredProperties.length !== 0 &&
            compareFilteredProperties.forEach(async (entry) => {
              await stackSDKInstance
                .contentType('banner')
                .entry()
                .create({ entry: { title: entry.title, url: entry.urlPath } });
            });
        } catch (error) {
          throw error;
        }
      },
    };
  };
  // console.log(comparebranch);
  migration.addTask(createEntryTask());
};
