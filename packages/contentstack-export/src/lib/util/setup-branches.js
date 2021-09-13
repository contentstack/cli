const mkdirp = require("mkdirp");
const path = require("path");
const request = require("./request");
const helper = require("./helper");

const setupBranches = async (config, branch) => {
  if (typeof config !== "object") {
    throw new Error("Invalid config to setup the branch");
  }

  try {
    let branches = [];
    if (typeof branch === "string") {
      //check branch exists
      const result = await request({
        url: `https://${config.host}/v3/stacks/branches/${branch}`,
        headers: {
          api_key: config.source_stack,
          authtoken: config.auth_token,
        },
      });
      if (
        result &&
        typeof result.body === "object" &&
        typeof result.body.branch === "object"
      ) {
        branches.push(result.body.branch);
      } else {
        throw new Error("No branch found with the name " + branch);
      }
    } else {
      const result = await request({
        url: `https://${config.host}/v3/stacks/branches`,
        headers: {
          api_key: config.source_stack,
          authtoken: config.auth_token,
        },
      });
      if (
        result &&
        result.body &&
        Array.isArray(result.body.branches) &&
        result.body.branches.length > 0
      ) {
        branches = result.body.branches;
      } else {
        branches.push("master");
      }
    }

    mkdirp.sync(config.data);
    // create branch info file
    helper.writeFile(path.join(config.data, "branches.json"), branches);
    // add branches list in the
    config.branches = branches;
  } catch (error) {
    console.log("failed to setup the branch");
  }
};

module.exports = setupBranches;
