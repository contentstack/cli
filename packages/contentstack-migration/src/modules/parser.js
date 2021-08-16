'use strict';

const Migration = require('./migration'),

  {
    CreateContentTypeValidator,
    EditContentTypeValidator,
    _TypeError,
  } = require('../validators'),
  // TODO: Need a better way to combine classes
  Base = require('./base'),

  { ActionList } = require('../actions'),
  // Utils
  { map: _map, constants } = require('../utils'),
  // map properties
  { getMapInstance, get } = _map,
  // Constants
  { actionMapper, MANAGEMENT_SDK } = constants;

class Parser {
  async getMigrationParser(migrationFunc) {
    const migration = new Migration(),
      mapInstance = getMapInstance(),
      parseResult = {},
      typeErrors = [];
    // migrations
    try {
      let stackSDKInstance = get(MANAGEMENT_SDK, mapInstance);
      await migrationFunc({migration, stackSDKInstance});
    } catch (error) {
      if (error instanceof TypeError) {
        if (error.message.includes('is not a function')) {
          const base = new Base(),
            // eslint-disable-next-line
            [, filename, line] = error.stack.match(/\/([\/\w-_\.]+\.js):(\d*):(\d*)/),
            callsite = {
              getFileName: () => `/${filename}`,
              getLineNumber: () => line
            },
            errMsgString = error.message.split(' '),
            typeErrorFirstStr = errMsgString[0].split('.'),
            typeErrorFunction = typeErrorFirstStr[typeErrorFirstStr.length - 1];

          typeErrors.push(typeErrorFunction);
          base.dispatch(callsite, null, { typeErrors }, 'typeError');
        }
      }
    }
    const actions = get(actionMapper, mapInstance),

      actionList = new ActionList(actions);

    actionList.addValidators(new CreateContentTypeValidator());
    actionList.addValidators(new _TypeError());
    actionList.addValidators(new EditContentTypeValidator());

    const hasErrors = actionList.validate();

    if (hasErrors.length) {
      parseResult.hasErrors = hasErrors;
      return parseResult;
    }

    return parseResult;
  }
}

module.exports = Parser;