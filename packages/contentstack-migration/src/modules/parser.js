'use strict';

const Migration = require('./migration');

const { CreateContentTypeValidator, EditContentTypeValidator, _TypeError, FieldValidator } = require('../validators');
// eslint-disable-next-line no-warning-comments
// TODO: Need a better way to combine classes
const Base = require('./base');

const { ActionList } = require('../actions');
// Utils
const { map: _map, constants, fsHelper } = require('../utils');
// map properties
const { getMapInstance, get } = _map;
// Constants
const {
  actionMapper,
  MANAGEMENT_SDK,
  MANAGEMENT_TOKEN,
  AUTH_TOKEN,
  API_KEY,
  BRANCH,
  MANAGEMENT_CLIENT,
  SOURCE_BRANCH,
} = constants;

class Parser {
  async getMigrationParser(migrationFunc) {
    const migration = new Migration();
    const mapInstance = getMapInstance();
    const parseResult = {};
    let typeErrors = [];
    // migrations
    try {
      const stackSDKInstance = get(MANAGEMENT_SDK, mapInstance);
      const managementToken = get(MANAGEMENT_TOKEN, mapInstance);
      const authToken = get(AUTH_TOKEN, mapInstance);
      const apiKey = get(API_KEY, mapInstance);
      const branch = get(BRANCH, mapInstance);
      const managementAPIClient = get(MANAGEMENT_CLIENT, mapInstance);
      const externalConfigPath = get('config-path', mapInstance);
      const externalConfig = get('config', mapInstance);
      let externalFileConfig;
      if (typeof externalConfigPath == 'string') {
        externalFileConfig = await fsHelper.readJSONFile(externalConfigPath);
      }
      const config = Object.assign({}, externalFileConfig, externalConfig);
      await migrationFunc({
        migration,
        stackSDKInstance,
        managementAPIClient,
        managementToken,
        authToken,
        apiKey,
        branch,
        config,
      });
    } catch (error) {
      if (error instanceof TypeError) {
        if (error.message.includes('is not a function')) {
          const base = new Base();
          // eslint-disable-next-line
          const [, filename, line] = error.stack.match(/\/([\/\w-_\.]+\.js):(\d*):(\d*)/);
          const callsite = {
            getFileName: () => `/${filename}`,
            getLineNumber: () => line,
          };
          const errMsgString = error.message.split(' ');
          const typeErrorFirstStr = errMsgString[0].split('.');
          const typeErrorFunction = typeErrorFirstStr[typeErrorFirstStr.length - 1];
          typeErrors.push(typeErrorFunction);
          base.dispatch(callsite, null, { typeErrors }, 'typeError');
        }
      } else {
        console.log(error);
        // eslint-disable-next-line
        const [, filename, line] = error.stack.match(/\/([\/\w-_\.]+\.js):(\d*):(\d*)/);
        const callsite = {
          getFileName: () => `/${filename}`,
          getLineNumber: () => line,
        };
        const base = new Base();
        typeErrors = [error];
        base.dispatch(callsite, null, { typeErrors }, 'typeError');
      }
    }
    const actions = get(actionMapper, mapInstance);
    const actionList = new ActionList(actions);

    actionList.addValidators(new CreateContentTypeValidator());
    actionList.addValidators(new FieldValidator());
    actionList.addValidators(new _TypeError());
    actionList.addValidators(new EditContentTypeValidator());

    const hasErrors = actionList.validate();

    if (hasErrors.length > 0) {
      parseResult.hasErrors = hasErrors;
      return parseResult;
    }
    return parseResult;
  }
}

module.exports = Parser;
