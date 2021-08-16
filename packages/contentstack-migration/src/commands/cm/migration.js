'use strict';

// Dependencies
const Listr = require('listr'),
  { resolve } = require('path'),
  { Command, flags } = require('@contentstack/cli-command'),
  { waterfall } = require('async'),
  { fork } = require('child_process'),
  { Parser } = require('../../modules'),
  { ActionList } = require('../../actions'),
  fs = require('fs'),
  { ApiError, SchemaValidator, MigrationError, FieldValidator } = require('../../validators'),

  // Utils
  { map: _map, constants, safePromise, errorHelper, errorHandler } = require('../../utils'),

  // Properties
  { get, set, getMapInstance, resetMapInstance } = _map,
  { requests: _requests, actionMapper, MANAGEMENT_SDK } = constants;

class MigrationCommand extends Command {
  async run() {
    // TODO: filePath validation required.
    const { flags } = this.parse(MigrationCommand),
      { filePath, multi, branch } = flags,
      authtoken = flags.authtoken,
      apiKey = flags['api-key'],
      alias = flags['management-token-alias'];

    let stackSDKInstance = undefined

    // Reset map instance
    const mapInstance = getMapInstance();
    resetMapInstance(mapInstance);


    if (alias) {
      let managementToken = this.getToken(alias)
      if (managementToken) {
        if(branch) {
          stackSDKInstance = this.managementAPIClient.stack({management_token: managementToken.token, api_key: managementToken.apiKey, branch_uid: branch })
        } else {
          stackSDKInstance = this.managementAPIClient.stack({management_token: managementToken.token, api_key: managementToken.apiKey })
        }
      }
    }
        
    if(authtoken) {
      this.managementAPIClient = {authtoken: this.authToken}
      if(branch) {
        stackSDKInstance = this.managementAPIClient.stack({ api_key: apiKey, branch_uid: branch })
      } else {
        stackSDKInstance = this.managementAPIClient.stack({ api_key: apiKey})
      }
    }

    set(MANAGEMENT_SDK, mapInstance, stackSDKInstance);

    if (multi) {
      await this.execMultiFiles(filePath, mapInstance);
    } else {
      await this.execSingleFile(filePath, mapInstance);
    }
  }

  async execSingleFile(filePath, mapInstance) {

    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath);
      // User provided migration function
    const migrationFunc = require(resolvedMigrationPath),

      parser = new Parser(),

      migrationParser = parser.getMigrationParser(migrationFunc);

    if (migrationParser.hasErrors) {
      errorHelper(migrationParser.hasErrors);
      // When the process is child, send error message to parent
      if (process.send) process.send({ errorOccurred: true });
      this.exit(1);
    }

    // Make calls from here
    const requests = get(_requests, mapInstance),
      // Fetches tasks array
      tasks = await this.getTasks(requests),

      listr = new Listr(tasks);

    await listr.run().catch(err => {
      this.handleErrors(err);
      // When the process is child, send error message to parent
      if (process.send) process.send({ errorOccurred: true });
      // this.exit(0);
    });
    
  }

  async execMultiFiles(filePath, mapInstance) {
    
    // Resolved absolute path
    const resolvedMigrationPath = resolve(filePath);
    // const child = fork(resolvedMigrationPath);
    try {
      const files = fs.readdirSync(resolvedMigrationPath)
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        await this.execSingleFile(resolve(filePath,file), mapInstance)
      }
        
    } catch (error) {
      console.log(error)
    }

    

    // child.on('message', message => {
    //   if (message.errorOccurred) {
    //     errorHandler(null, null, null, 'Something went wrong. Please check logs');
    //     child.kill('SIGINT'); // Interrupt signal
    //   }
    // });

    // child.on('error', error => {
    //   errorHandler(null, null, null, error);
    // });
  }

  async getTasks(requests) {
    const _tasks = [], results = [];

    for(let i=0; i<requests.length; i++) {
      let reqObj = requests[i];
      const { title, failedTitle, successTitle, tasks } = reqObj,
        task = {
          title: title,
          task: async (ctx, task) => {
            const [err, result] = await safePromise(waterfall(tasks))
            if (err) { ctx.error = true; task.title = failedTitle; throw err;} 
            result && results.push(result);
            task.title = successTitle;
            return result
          }
        };
      _tasks.push(task);
    }
    return _tasks;
  }

  handleErrors() {
    const mapInstance = getMapInstance(),
      actions = get(actionMapper, mapInstance),
      actionList = new ActionList(actions);

    actionList.addValidators(new ApiError());
    actionList.addValidators(new SchemaValidator());
    actionList.addValidators(new MigrationError());
    actionList.addValidators(new FieldValidator());

    const errors = actionList.validate();
    errorHelper(errors);
  }
}

MigrationCommand.description = 'Contentstack migration script.';

MigrationCommand.flags = {
  'api-key': flags.string({ char: 'k', description: 'Api key along with authtoken to be used', dependsOn: ['authtoken'], exclusive: ['management-token-alias'] }),
  'authtoken': flags.boolean({ char: 'A', description: 'Use authtoken', dependsOn: ['api-key'], exclusive: ['management-token-alias'] }),
  'management-token-alias': flags.string({char: 'a', description: 'Alias to be used', exclusive: ['authtoken'] }), // Add a better description
  filePath: flags.string({ char: 'n', description: 'Provides filepath to migration script provided by user.' }),
  branch: flags.string({ char: 'b', description: 'Branch name' }),
  multi: flags.boolean({ description: 'Supports multiple files' }) // Add a better description
};

module.exports = MigrationCommand;