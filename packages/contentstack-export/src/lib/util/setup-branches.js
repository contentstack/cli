const mkdirp = require('mkdirp');
const path = require('path');
const helper = require('./helper');
const {isAuthenticated, configHandler} = require('@contentstack/cli-utilities')

const setupBranches = async (config, branch, stackAPIClient) => {
  if (typeof config !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }

  let branches = [];

  const headers = { api_key: config.source_stack };

  if (isAuthenticated()) {
    headers['authtoken'] = configHandler.get('authtoken');
  } else if (config.management_token) {
    headers['authorization'] = config.management_token;
  }

  if (typeof branch === 'string') {
    // check branch exists
    const result = await stackAPIClient
      .branch(branch)
      .fetch()
      .catch((_err) => {});
    if (result && typeof result === 'object') {
      branches.push(result);
    } else {
      throw new Error('No branch found with the name ' + branch);
    }
  } else {
    try {
      const result = await stackAPIClient
        .branch()
        .query()
        .find()
        .catch((_err) => {});
      if (result && result.items && Array.isArray(result.items) && result.items.length > 0) {
        branches = result.items;
      } else {
        return;
      }
    } catch (error) {
      return;
    }
  }

  mkdirp.sync(config.data);
  // create branch info file
  helper.writeFile(path.join(config.data, 'branches.json'), branches);
  // add branches list in the
  config.branches = branches;
};

module.exports = setupBranches;
