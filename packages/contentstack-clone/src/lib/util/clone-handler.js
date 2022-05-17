let inquirer = require('inquirer');
const _ = require('lodash');
const fs = require('fs');
let ora = require('ora');
const async = require('async');
const path = require('path');

let sdkInstance = require('../../lib/util/contentstack-management-sdk');
let exportCmd = require('@contentstack/cli-cm-export');
let importCmd = require('@contentstack/cli-cm-import');
let client = {};
let config;

let stackCreationConfirmation = [
  {
    type: 'confirm',
    name: 'stackCreate',
    message: 'Want to clone content into a new stack ?',
    initial: true,
  },
];

let stackName = {
  type: 'input',
  name: 'stack',
  message: 'Enter name for the new stack to store the cloned content ?',
  default: 'ABC',
};

let orgUidList = {};
let stackUidList = {};
let masterLocaleList = {};

let structureList = [
  'locales',
  'environments',
  'extensions',
  'webhooks',
  'global-fields',
  'content-types',
  'workflows',
  'labels',
];
var oraMessage;
let master_locale;

class CloneHandler {
  constructor(opt) {
    config = opt;
    client = sdkInstance.Client(config);
  }

  async start() {
    return new Promise(async (resolve, reject) => {
      oraMessage = 'Choose an organization where your source stack exists:';
      // export section starts from here
      let orgdetails = this.getOrganizationChoices(oraMessage);
      orgdetails.then(async (orgList) => {
        var stackMessage = 'Select the source stack';
        var orgSelected = await inquirer.prompt(orgList);
        let stackDetails = this.getStack(orgSelected, stackMessage);
        stackDetails.then(async (stackList) => {
          let stackSelected = await inquirer.prompt(stackList);
          config.source_stack = stackUidList[stackSelected.stack];
          master_locale = masterLocaleList[stackSelected.stack];
          config.sourceStackName = stackSelected.stack;
          if (!config.sourceStackBranch) {
            try {
              const branches = await client.stack({ api_key: config.source_stack }).branch().query().find();
              if (branches && branches.items && branches.items.length) {
                config.sourceStackBranch = 'main';
              }
            } catch (_error) {
              // empty handler
            }
          }
          stackName.default = 'Copy of ' + stackSelected.stack;
          let cmdExport = this.cmdExport();
          cmdExport
            .then(async () => {
              //Import section starts from here
              var stackCreateConfirmation = await inquirer.prompt(stackCreationConfirmation);
              if (stackCreateConfirmation.stackCreate !== true) {
                oraMessage = 'Choose an organization where the destination stack exists: ';
                let orgChoices = this.getOrganizationChoices(oraMessage);
                orgChoices
                  .then(async (_orgList) => {
                    var destinationStackMessage = 'Choose the destination stack:';
                    var selectedDestinationOrg = await inquirer.prompt(_orgList);
                    let destinationStacks = this.getStack(selectedDestinationOrg, destinationStackMessage);
                    destinationStacks
                      .then(async (destinationStackList) => {
                        let selectedDestinationStack = await inquirer.prompt(destinationStackList);
                        config.target_stack = stackUidList[selectedDestinationStack.stack];
                        config.destinationStackName = selectedDestinationStack.stack;
                        this.cloneTypeSelection()
                          .then((msgData) => {
                            return resolve(msgData);
                          })
                          .catch((error) => {
                            return reject(error.errorMessage);
                          });
                      })
                      .catch((error) => {
                        return reject(error.errorMessage);
                      });
                  })
                  .catch((error) => {
                    return reject(error.errorMessage);
                  });
              } else {
                oraMessage = 'Choose an organization where you want to create a stack: ';
                let createStackOrganizations = this.getOrganizationChoices(oraMessage);
                createStackOrganizations
                  .then(async (_orgList) => {
                    var selectedOrgToCreateStack = await inquirer.prompt(_orgList);
                    let orgUid = orgUidList[selectedOrgToCreateStack.Organization];
                    this.createNewStack(orgUid)
                      .then(() => {
                        this.cloneTypeSelection()
                          .then((msgData) => {
                            return resolve(msgData);
                          })
                          .catch((error) => {
                            return reject(error);
                          });
                      })
                      .catch((error) => {
                        return reject(
                          error.errorMessage + ' Contact the Organization owner for Stack Creation access.',
                        );
                      });
                  })
                  .catch((error) => {
                    return reject(error.errorMessage);
                  });
              }
            })
            .catch((error) => {
              return reject(error);
            });
        });
      });
    });
  }

  getOrganizationChoices = async (orgMessage) => {
    let orgChoice = {
      type: 'list',
      name: 'Organization',
      message: orgMessage !== undefined ? orgMessage : 'Choose an organization',
      choices: [],
    };
    return new Promise(async (resolve, reject) => {
      const spinner = ora('Fetching Organization').start();
      try {
        let organizations = await client.organization().fetchAll({ limit: 100 });
        spinner.succeed('Fetched Organization');
        for (let i = 0; i < organizations.items.length; i++) {
          orgUidList[organizations.items[i].name] = organizations.items[i].uid;
          orgChoice.choices.push(organizations.items[i].name);
        }
        return resolve(orgChoice);
      } catch (e) {
        spinner.fail();
        return reject(e);
      }
    });
  };

  getStack = async (answer, stkMessage) => {
    return new Promise(async (resolve, reject) => {
      let stackChoice = {
        type: 'list',
        name: 'stack',
        message: stkMessage !== undefined ? stkMessage : 'Select the stack',
        choices: [],
      };
      const spinner = ora('Fetching stacks').start();
      try {
        let orgUid = orgUidList[answer.Organization];
        let stackList = client.stack().query({ organization_uid: orgUid }).find();
        stackList
          .then(async (stacklist) => {
            for (let j = 0; j < stacklist.items.length; j++) {
              stackUidList[stacklist.items[j].name] = stacklist.items[j].api_key;
              masterLocaleList[stacklist.items[j].name] = stacklist.items[j].master_locale;
              stackChoice.choices.push(stacklist.items[j].name);
            }
            spinner.succeed('Fetched stack');
            return resolve(stackChoice);
          })
          .catch((error) => {
            spinner.fail();
            return reject(error);
          });
      } catch (e) {
        spinner.fail();
        return reject(e);
      }
    });
  };

  async createNewStack(orgUid) {
    return new Promise(async (resolve, reject) => {
      let inputvalue = await inquirer.prompt(stackName);
      let stack = { name: inputvalue.stack, master_locale: master_locale };
      const spinner = ora('Creating New stack').start();
      let newStack = client.stack().create({ stack }, { organization_uid: orgUid });
      newStack
        .then((result) => {
          spinner.succeed('New Stack created Successfully name as ' + result.name);
          config.target_stack = result.api_key;
          config.destinationStackName = result.name;
          return resolve(result);
        })
        .catch((error) => {
          spinner.fail();
          return reject(error);
        });
    });
  }

  async cloneTypeSelection() {
    return new Promise(async (resolve, reject) => {
      let cloneTypeSelection = [
        {
          type: 'list',
          name: 'type',
          message: 'Choose the type of data to clone:',
          choices: [
            'Structure (all modules except entries & assets)',
            'Structure with content (all modules including entries & assets)',
          ],
        },
      ];
      var selectedValue = await inquirer.prompt(cloneTypeSelection);
      let cloneType = selectedValue.type;
      config['data'] = path.join(__dirname.split('src')[0], 'contents', config.sourceStackBranch || '');
      if (cloneType === 'Structure (all modules except entries & assets)') {
        config['modules'] = structureList;
        let cmdImport = this.cmdImport();
        cmdImport
          .then(() => {
            return resolve('Stack clone Structure completed');
          })
          .catch((error) => {
            return reject(error);
          });
      } else {
        let cmdImport = this.cmdImport();
        cmdImport
          .then(() => {
            return resolve('Stack clone completed with structure and content');
          })
          .catch((error) => {
            return reject(error);
          });
      }
    });
  }

  async cmdExport() {
    return new Promise((resolve, reject) => {
      const cmd = ['-k', config.source_stack, '-d', __dirname.split('src')[0] + 'contents'];
      if (config.sourceStackBranch) {
        cmd.push('--branch', config.sourceStackBranch);
      }

      let exportData = exportCmd.run(cmd);
      exportData
        .then(async () => {
          return resolve();
        })
        .catch((error) => {
          return reject(error);
        });
    });
  }

  async cmdImport() {
    return new Promise(async (resolve, _reject) => {
      const cmd = ['-c', path.join(__dirname, 'dummyConfig.json')];
      if (config.sourceStackBranch) {
        cmd.push('-d', path.join(__dirname, config.sourceStackBranch));
      }
      if (config.targetStackBranch) {
        cmd.push('--branch', config.targetStackBranch);
      }

      await importCmd.run(cmd);
      return resolve();
    });
  }
}

module.exports = {
  CloneHandler,
  client,
};
