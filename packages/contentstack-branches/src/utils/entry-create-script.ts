export function entryCreateScript(contentType) {
  return `
module.exports = async ({ migration, stackSDKInstance, managementAPIClient, config, branch, apiKey }) => {
  const keysToRemove = [
    'content_type_uid',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'ACL',
    'stackHeaders',
    'urlPath',
    '_version',
    '_in_progress',
    'update',
    'delete',
    'fetch',
    'publish',
    'unpublish',
    'publishRequest',
    'setWorkflowStage',
    'import',
  ];

  let compareBranch = config['compare-branch'];

  const createEntryTask = () => {
    return {
      title: 'Create Entries',
      successTitle: 'Entries Created Successfully',
      failedTitle: 'Failed to create entries',
      task: async () => {
        const compareBranchEntries = await managementAPIClient
          .stack({ api_key: stackSDKInstance.api_key, branch_uid: compareBranch }) //
          .contentType('${contentType}')
          .entry()
          .query()
          .find();
        const compareFilteredProperties = compareBranchEntries.items.map((entry) => {
          keysToRemove.map((key) => delete entry[key]);
          return entry;
        });
        try {
          compareFilteredProperties.length !== 0 &&
            compareFilteredProperties.forEach(async (entryDetails) => {
              await stackSDKInstance.contentType('${contentType}').entry().create({ entry: entryDetails });
            });
        } catch (error) {
          throw error;
        }
      },
    };
  };
  if (compareBranch && branch.length !== 0 && apiKey.length !== 0) {
    migration.addTask(createEntryTask());
  } else {
    if (apiKey.length === 0) {
      console.error('Please provide api key using --stack-api-key flag');
    }
    if (!compareBranch) {
      console.error('Please provide compare branch through --config compare-branch:<value> flag');
    }
    if (branch.length === 0) {
      console.error('Please provide branch name through --branch flag');
    }
  }
};
`;
}
