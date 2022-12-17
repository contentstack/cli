const mkdirp = require('mkdirp');
const path = require('path');
const helper = require('./helper');
const { HttpClient } = require('@contentstack/cli-utilities');

const setupBranches = async (config, branch) => {
  if (typeof config !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }
  let branches = [];
  const headers = { api_key: config.source_stack };

  if (config.auth_token) {
    headers['authtoken'] = config.auth_token;
  } else if (config.management_token) {
    headers['authorization'] = config.management_token;
  }

  if (typeof branch === 'string') {
    // check branch exists
    const result = await HttpClient.create()
      .headers(headers)
      .get(`https://${config.host}/v3/stacks/branches/${branch}`);

    if (result && typeof result.data === 'object' && typeof result.data.branch === 'object') {
      branches.push(result.data.branch);
    } else {
      throw new Error('No branch found with the name ' + branch);
    }
  } else {
    try {
      const result = await HttpClient.create().headers(headers).get(`https://${config.host}/v3/stacks/branches`);

      if (result && result.data && Array.isArray(result.data.branches) && result.data.branches.length > 0) {
        branches = result.data.branches;
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
