const fs = require('fs');
const _ = require('lodash');
const https = require('https');
const config = require('../../../src/config/default');
const { Command } = require('@contentstack/cli-command');
const { managementSDKClient } = require('@contentstack/cli-utilities');
const pjson = require('../../../package.json');
const { REGIONS } = require('../../config.json');

let envData = { NA: {}, EU: {}, 'AZURE-NA': {}, 'AZURE-EU': {}, env_pushed: false };

class Helper extends Command {
  async run() {
    return this.region;
  }
}

const initEnvData = (regions = ['NA', 'EU', 'AZURE-NA', 'AZURE-EU']) => {
  if (!envData.env_pushed) envData = { ...envData, ...process.env, env_pushed: true };

  const { APP_ENV, DELIMITER, KEY_VAL_DELIMITER } = envData;

  _.forEach(regions, (region) => {
    if (!envData[region] || _.isEmpty(envData[region][module])) {
      if (envData[`${APP_ENV}_${region}_BRANCH`]) {
        envData[region]['BRANCH'] = _.fromPairs(_.map(_.split(envData[`${APP_ENV}_${region}_BRANCH`], DELIMITER), val => _.split(val, KEY_VAL_DELIMITER)));
      }
      if (envData[`${APP_ENV}_${region}_NON_BRANCH`]) {
        envData[region]['NON_BRANCH'] = _.fromPairs(_.map(_.split(envData[`${APP_ENV}_${region}_NON_BRANCH`], DELIMITER), val => _.split(val, KEY_VAL_DELIMITER)));
      }
    }
  })
}

const getStacksFromEnv = () => {
  let pluginName = pjson.name.split('/')[1].split('-').pop(); // get plugin name from package.json
  const { APP_ENV } = process.env;
  const keys = Object.keys(process.env).filter(key => key.includes(`${APP_ENV}_`) && key.includes(`${pluginName.toUpperCase()}`))
  return keys;
}

const getStackDetailsByRegion = (region, DELIMITER, KEY_VAL_DELIMITER) => {
  const stacksFromEnv = getStacksFromEnv()
  const stackDetails = {}
  for (let stack of stacksFromEnv) {
    stackDetails[stack] = {}
    process.env[stack].split(DELIMITER).forEach(element => {
      let [key, value] = element.split(KEY_VAL_DELIMITER)
      stackDetails[stack][key] = value;
    })
  }
  Object.keys(stackDetails).forEach(key => {
    if (stackDetails[key]['REGION_NAME'] !== region) {
      delete stackDetails[key]
    }
  })

  return stackDetails;
}

const getBranches = async (data) => {
  const branches = await getStack(data)
    .branch()
    .query()
    .find()
    .then(branches => branches.map(branch => branch.uid));

  return branches;
}

const getEnvData = () => envData

const getStack = async (data={}) => {
  const client = await managementSDKClient(config);
  return client.stack({
    api_key: data.STACK_API_KEY || config.target_stack,
    management_token: data.MANAGEMENT_TOKEN || config.management_token
  });
}

const getAssetAndFolderCount = (data) => {
  return new Promise(async (resolve) => {
    const stack = await getStack(data)
    const assetCount = await stack.asset()
      .query({ include_count: true, limit: 1 })
      .find()
      .then(({ count }) => count);
    const folderCount = await stack.asset()
      .query({
        limit: 1,
        include_count: true,
        include_folders: true,
        query: { is_dir: true }
      })
      .find()
      .then(({ count }) => count);

    resolve({ assetCount, folderCount })
  })
}

const getLocalesCount = (data) => {
  return new Promise(async (resolve) => {
    const localeConfig = config.modules.locales;
    const masterLocale = config.master_locale;
    const requiredKeys = localeConfig.requiredKeys;
    const queryVariables = {
      limit: 1,
      asc: 'updated_at',
      include_count: true,
      query: {
        code: {
          $nin: [masterLocale.code]
        },
      },
      only: {
        BASE: [requiredKeys]
      }
    };
    const stack = await getStack(data);
    const localeCount = await stack
      .locale()
      .query(queryVariables)
      .find()
      .then(({ count }) => count);

    resolve(localeCount);
  })
}

const getEnvironmentsCount = async (data) => {
  const queryVariables = {
    include_count: true
  };
  const stack = await getStack(data);
  const environmentCount = await stack
    .environment()
    .query(queryVariables)
    .find()
    .then(({ count }) => count);

  return environmentCount;
}

const getExtensionsCount = async (data) => {
  const queryVariables = {
    include_count: true
  };
  const stack = await getStack(data);
  const extensionCount = await stack
    .extension()
    .query(queryVariables)
    .find()
    .then(({ count }) => count);

  return extensionCount;
}
const getMarketplaceAppsCount = async (data) => { 
  const queryVariables = {
    include_count: true,
    include_marketplace_extensions: true
  }

  const marketplaceExtensionsCount = await getStack(data)
    .extension()
    .query(queryVariables)
    .find()
    .then(({ count }) => count)

  return marketplaceExtensionsCount;
}

const getGlobalFieldsCount = async (data) => {
  const queryVariables = {
    include_count: true
  }
  const stack = await getStack(data);
  const globalFieldCount = await stack
    .globalField()
    .query(queryVariables)
    .find()
    .then(({items}) => items.length)

  return globalFieldCount;
}

const getContentTypesCount = async (data) => {
  const stack = await getStack(data);
  const queryVariables = {
    include_count: true
  };

  const contentTypeCount = await stack
    .contentType()
    .query(queryVariables)
    .find()
    .then(({ count }) => count)

  return contentTypeCount;
}

const getEntriesCount = async (data) => {
  let entriesCount = 0;
  const stack = await getStack(data);
  const queryVariables = {
    include_count: true
  };

  const contentTypes = await stack
    .contentType()
    .query()
    .find()
    .then(({ items }) => items.map(item => item.uid));

  for (let contentType of contentTypes) {
    let entries = await stack
      .contentType(contentType)
      .entry()
      .query(queryVariables)
      .find()
      .then(({ count }) => count)

    entriesCount += entries;
  }

  return entriesCount;
}

const getCustomRolesCount = async (data) => {
  const EXISTING_ROLES = {
    Admin: 1,
    Developer: 1,
    'Content Manager': 1,
  };

  const queryVariables = {
    include_count: true
  };

  const stack = await getStack(data);
  const customRoles = await stack
    .role()
    .fetchAll(queryVariables)
    .then(({ items }) => {
      return items.filter(role => !EXISTING_ROLES[role.name]).length
    });

  return customRoles;
 }

const getWebhooksCount = async (data) => {
  const queryVariables = {
    include_count: true
  }

  const stack = await getStack(data);
  const webhooksCount = await stack
    .webhook()
    .fetchAll(queryVariables)
    .then(({ count }) => count);

  return webhooksCount;
}

const getWorkflowsCount = async (data) => {
  const queryVariables = {
    include_count: true
  }
  const stack = await getStack(data);
  const workflowCount = await stack
    .workflow()
    .fetchAll(queryVariables)
    .then(({ count }) => count);

  return workflowCount;
}

const getLoginCredentials = () => {
  let creds = {};
  for (let region of REGIONS) {
    const keys = Object.keys(process.env).filter(key => key.includes(`${region}_`))
    if (keys.length > 0) {
      creds[region] = {
        REGION: region
      }
      keys.forEach(element => {
        if(element.includes('USERNAME')) {
          creds[region]['USERNAME'] = process.env[element];
        } else {
          creds[region]['PASSWORD'] = process.env[element];
        }
      })
    }
  }
  return creds;
}

const readJsonFileContents = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      let buf = '';
      const stream = fs.createReadStream(filePath, { flags: 'r', encoding: 'utf-8' });

      const processLine = (line) => { // here's where we do something with a line
        if (line[line.length - 1] == '\r') line = line.substr(0, line.length - 1); // discard CR (0x0D)

        if (line.length > 0) { // ignore empty lines
          resolve(JSON.parse(line)) // parse the JSON
        }
      }

      const pump = () => {
        let pos;

        while ((pos = buf.indexOf('\n')) >= 0) { // keep going while there's a newline somewhere in the buffer
          if (pos == 0) { // if there's more than one newline in a row, the buffer will now start with a newline
            buf = buf.slice(1); // discard it
            continue; // so that the next iteration will start with data
          }
          processLine(buf.slice(0, pos)); // hand off the line
          buf = buf.slice(pos + 1); // and slice the processed data off the buffer
        }
      }

      stream.on('data', function (d) {
        buf += d.toString(); // when data is read, stash it in a string buffer
        pump(); // then process the buffer
      });
    } catch (error) {
      console.trace(error)
      reject(error)
    }
  })
}

const cleanUp = async (path) => {
  fs.rmSync(path, {recursive: true, force: true})
}

const deleteStack = async (data) => {
  return await _deleteStack(data);
}
const _deleteStack = data => {
  return new Promise((resolve, reject) => {
    const options = {
      host: 'api.contentstack.io',
      path: '/v3/stacks',
      port: 443,
      method: 'DELETE',
      headers: {
        api_key: data.apiKey,
        authtoken: data.authToken,
      }
    };
    const req = https.request(options, res => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
  
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(null);
        } else {
          console.log(body);
          reject(body);
        }
      });
    })
    req.on('error', error => {
      reject(error);
    });
    req.end();
  });
};

module.exports = {
  Helper,
  getStack,
  initEnvData,
  getEnvData,
  getLocalesCount,
  readJsonFileContents,
  getAssetAndFolderCount,
  getEnvironmentsCount,
  getExtensionsCount,
  getMarketplaceAppsCount,
  getGlobalFieldsCount,
  getContentTypesCount,
  getEntriesCount,
  getCustomRolesCount,
  getWebhooksCount,
  getWorkflowsCount,
  getStacksFromEnv,
  getBranches,
  getStackDetailsByRegion,
  getLoginCredentials,
  cleanUp,
  deleteStack,
}