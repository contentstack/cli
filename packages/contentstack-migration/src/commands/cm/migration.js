'use strict'

// Dependencies
const Listr = require('listr')
const {resolve, extname} = require('path')
const {Command, flags} = require('@contentstack/cli-command')
const {waterfall} = require('async')
const {Parser} = require('../../modules')
const {ActionList} = require('../../actions')
const fs = require('fs')
const chalk = require('chalk')

const {ApiError, SchemaValidator, MigrationError, FieldValidator} = require('../../validators')

// Utils
const {map: _map, constants, safePromise, errorHelper, errorHandler} = require('../../utils')
const {success} = require('../../utils/logger')

// Properties
const {get, set, getMapInstance, resetMapInstance} = _map
const {requests: _requests, actionMapper, MANAGEMENT_SDK, MANAGEMENT_TOKEN, AUTH_TOKEN, API_KEY, BRANCH} = constants

class MigrationCommand extends Command {
  async run() {
    // TODO: filePath validation required.
    const {flags} = this.parse(MigrationCommand)
    const {filePath, multi, branch} = flags
    const authtoken = flags.authtoken
    const apiKey = flags['api-key']
    const alias = flags['management-token-alias']

    let stackSDKInstance

    // Reset map instance
    const mapInstance = getMapInstance()
    resetMapInstance(mapInstance)
    if (branch) {
      set(BRANCH, mapInstance, branch)
    }

    if (alias) {
      let managementToken = this.getToken(alias)
      if (managementToken) {
        set(MANAGEMENT_TOKEN, mapInstance, managementToken)
        set(API_KEY, mapInstance, managementToken.apiKey)
        if (branch) {
          stackSDKInstance = this.managementAPIClient.stack({management_token: managementToken.token, api_key: managementToken.apiKey, branch_uid: branch})
        } else {
          stackSDKInstance = this.managementAPIClient.stack({management_token: managementToken.token, api_key: managementToken.apiKey})
        }
      }
    }

    if (authtoken) {
      set(AUTH_TOKEN, mapInstance, authtoken)
      set(API_KEY, mapInstance, apiKey)
      this.managementAPIClient = {authtoken: this.authToken}
      if (branch) {
        stackSDKInstance = this.managementAPIClient.stack({api_key: apiKey, branch_uid: branch})
      } else {
        stackSDKInstance = this.managementAPIClient.stack({api_key: apiKey})
      }
    }

    set(MANAGEMENT_SDK, mapInstance, stackSDKInstance)

    if (multi) {
      await this.execMultiFiles(filePath, mapInstance)
    } else {
      await this.execSingleFile(filePath, mapInstance)
    }
  }

  async execSingleFile(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath)
    // User provided migration function
    const migrationFunc = require(resolvedMigrationPath)

    const parser = new Parser()

    try {
      const migrationParser = await parser.getMigrationParser(migrationFunc)
      if (migrationParser.hasErrors) {
        errorHelper(migrationParser.hasErrors)
        // When the process is child, send error message to parent
        if (process.send) process.send({errorOccurred: true})
        this.exit(1)
      }

      // Make calls from here
      const requests = get(_requests, mapInstance)
      // Fetches tasks array
      const tasks = this.getTasks(requests)

      const listr = new Listr(tasks)

      await listr.run().catch(error => {
        this.handleErrors(error)
        // When the process is child, send error message to parent
        if (process.send) process.send({errorOccurred: true})
      })
      requests.splice(0, requests.length)
    } catch (error) {
      // errorHandler(null, null, null, error)
    }
  }

  async execMultiFiles(filePath, mapInstance) {
    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath)
    try {
      const files = fs.readdirSync(resolvedMigrationPath)
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        if (extname(file) === '.js') {
          success(chalk`{white Executing file:} {grey {bold ${file}}}`)
          // eslint-disable-next-line no-await-in-loop
          await this.execSingleFile(resolve(filePath, file), mapInstance)
        }
      }
    } catch (error) {
      error(error)
    }
  }

  getTasks(requests) {
    const _tasks = []
    const results = []

    for (let i = 0; i < requests.length; i++) {
      let reqObj = requests[i]
      const {title, failedTitle, successTitle, tasks} = reqObj
      const task = {
        title: title,
        task: async (ctx, task) => {
          const [err, result] = await safePromise(waterfall(tasks))
          if (err) {
            ctx.error = true
            task.title = failedTitle
            throw err
          }
          result && results.push(result)
          task.title = successTitle
          return result
        },
      }
      _tasks.push(task)
    }
    return _tasks
  }

  handleErrors() {
    const mapInstance = getMapInstance()
    const actions = get(actionMapper, mapInstance)
    const actionList = new ActionList(actions)

    actionList.addValidators(new ApiError())
    actionList.addValidators(new SchemaValidator())
    actionList.addValidators(new MigrationError())
    actionList.addValidators(new FieldValidator())

    const errors = actionList.validate()
    errorHelper(errors)
  }
}

MigrationCommand.description = 'Contentstack migration script.'

MigrationCommand.flags = {
  'api-key': flags.string({char: 'k', description: 'Api key along with authtoken to be used', dependsOn: ['authtoken'], exclusive: ['management-token-alias']}),
  authtoken: flags.boolean({char: 'A', description: 'Use authtoken', dependsOn: ['api-key'], exclusive: ['management-token-alias']}),
  'management-token-alias': flags.string({char: 'a', description: 'Alias to be used', exclusive: ['authtoken']}), // Add a better description
  filePath: flags.string({char: 'n', description: 'Provides filepath to migration script provided by user.'}),
  branch: flags.string({char: 'b', description: 'Branch name'}),
  multi: flags.boolean({description: 'Supports multiple files'}), // Add a better description
}

module.exports = MigrationCommand
