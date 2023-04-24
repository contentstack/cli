export function entryCreateScript(contentType) {
  return `module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config }) => {
  const keysToRemove = [
    'stackHeaders',
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
    .contentType('${contentType}')
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
      successTitle: 'Entries Created Successfully',
      failedTitle: 'Failed to create entries',
      task: async (params) => {
        try {
          compareFilteredProperties.length !== 0 &&
            compareFilteredProperties.forEach(async (entryDetails) => {
              await stackSDKInstance
                .contentType('${contentType}')
                .entry()
                .create({ entry: entryDetails });
            });
        } catch (error) {
          throw error;
        }
      },
    };
  };
  migration.addTask(createEntryTask());
};`;
}
