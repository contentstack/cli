const fs = require('fs');
const config = require('../../../src/config/default');
const { Command } = require('@contentstack/cli-command');
const managementSdk = require('../../../src/lib/util/contentstack-management-sdk');

class Helper extends Command {
  async run() {
    return this.region
  }
}

const getStack = () => {
  return managementSdk.Client(config)
    .stack({ api_key: config.source_stack, management_token: config.management_token })
}

const getAssetAndFolderCount = () => {
  return new Promise(async (resolve) => {
    const stack = getStack()
    const assetCount = await stack.asset()
      .query({ include_count: true, limit: 1 })
      .find()
      .then(({ count }) => count)
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

const getLocalesCount = () => {
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
    }
    const localeCount = await getStack()
      .locale()
      .query(queryVariables)
      .find()
      .then(({ count }) => count)

    resolve(localeCount)
  })
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

module.exports = {
  Helper,
  getStack,
  getLocalesCount,
  readJsonFileContents,
  getAssetAndFolderCount
}