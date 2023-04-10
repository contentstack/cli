const mockData = {};
const createBranchMockData = {
  flags: {
    source: 'main',
    uid: 'new_branch',
    apiKey: 'abcd',
  },
};
const deleteBranchMockData = {
  flags: {
    uid: 'new_branch',
    apiKey: 'abcd',
    force: false,
    confirm: false,
  },
};
export { mockData, createBranchMockData, deleteBranchMockData };
