'use strict'

const Migration = require('./migration')

const {
  CreateContentTypeValidator,
  EditContentTypeValidator,
  _TypeError,
} = require('../validators')
// TODO: Need a better way to combine classes
const Base = require('./base')

const {ActionList} = require('../actions')
// Utils
const {map: _map, constants} = require('../utils')
// map properties
const {getMapInstance, get} = _map
// Constants
const {actionMapper, MANAGEMENT_SDK} = constants

class Parser {
  async getMigrationParser(migrationFunc) {
    const migration = new Migration()
    const mapInstance = getMapInstance()
    const parseResult = {}
    const typeErrors = []
    // migrations
    try {
      let stackSDKInstance = get(MANAGEMENT_SDK, mapInstance)
      await migrationFunc({migration, stackSDKInstance})
    } catch (error) {
      if (error instanceof TypeError) {
        if (error.message.includes('is not a function')) {
          const base = new Base()
          // eslint-disable-next-line
            const [, filename, line] = error.stack.match(/\/([\/\w-_\.]+\.js):(\d*):(\d*)/);
          const callsite = {
            getFileName: () => `/${filename}`,
            getLineNumber: () => line,
          }
          const errMsgString = error.message.split(' ')
          const typeErrorFirstStr = errMsgString[0].split('.')
          const typeErrorFunction = typeErrorFirstStr[typeErrorFirstStr.length - 1]
          typeErrors.push(typeErrorFunction)
          base.dispatch(callsite, null, {typeErrors}, 'typeError')
          throw error
        }
      } else {
        throw error
      }
    }
    const actions = get(actionMapper, mapInstance)
    const actionList = new ActionList(actions)

    actionList.addValidators(new CreateContentTypeValidator())
    actionList.addValidators(new _TypeError())
    actionList.addValidators(new EditContentTypeValidator())

    const hasErrors = actionList.validate()

    if (hasErrors.length > 0) {
      parseResult.hasErrors = hasErrors
      return parseResult
    }
    return parseResult
  }
}

module.exports = Parser
