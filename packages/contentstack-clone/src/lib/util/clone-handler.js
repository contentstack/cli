const ora = require('ora');
const path = require('path');
const inquirer = require('inquirer');

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
  default: 'ABC',
  message: 'Enter name for the new stack to store the cloned content ?'
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
let master_locale;

class CloneHandler {
  constructor(opt) {
    config = opt;
    client = sdkInstance.Client(config);
  }

  #handleOrgSelection(options = {}) {
    return new Promise(async (resolve, reject) => {
      const { msg = '', isSource = true } = options || {}
      const orgList = await this.getOrganizationChoices(msg).catch(reject)

      if (orgList) {
        const orgSelected = await inquirer.prompt(orgList);
  
        if (isSource) {
          config.sourceOrg = orgUidList[orgSelected.Organization]; 
        } else {
          config.targetOrg = orgUidList[orgSelected.Organization]; 
        }

        resolve(orgSelected)
      }
    })
  }

  #handleStackSelection(options = {}) {
    return new Promise(async (resolve, reject) => {
      const { org = {}, msg = '', isSource = true } = options || {}
      const stackList = await this.getStack(org, msg, isSource).catch(reject)

      if (stackList) {
        const selectedStack = await inquirer.prompt(stackList);
  
        if (isSource) {
          config.sourceStackName = selectedStack.stack;
          master_locale = masterLocaleList[selectedStack.stack];
          config.source_stack = stackUidList[selectedStack.stack];
        } else {
          config.target_stack = stackUidList[selectedStack.stack];
          config.destinationStackName = selectedStack.stack;
        }

        resolve(selectedStack)
      }
    })
  }

  start() {
    return new Promise(async (resolve, reject) => {
      let sourceStack = {}
      const handleOrgAndStackSelection = (orgMsg, stackMsg, isSource = true) => {
        return new Promise(async (resolve) => {
          const org = await this.#handleOrgSelection({ msg: orgMsg, isSource })
            .catch((error) => reject(error.errorMessage))

          if (org) {
            await this.#handleStackSelection({
              org,
              isSource,
              msg: stackMsg
            }).then(resolve)
              .catch((error) => reject(error.errorMessage))
          }
        })
      }

      if (!config.source_stack) {
        // NOTE Export section
        sourceStack = await handleOrgAndStackSelection(
          'Choose an organization where your source stack exists:',
          'Select the source stack'
        )
      }

      if (config.source_stack) {
        if (!config.sourceStackBranch) {
          try {
            const branches = await client.stack({ api_key: config.source_stack }).branch().query().find();
  
            if (branches && branches.items && branches.items.length) {
              config.sourceStackBranch = 'main';
            }
          } catch (_error) {}
        }

        stackName.default = config.stackName || `Copy of ${sourceStack.stack || config.source_alias}`;
        const exportRes = await this.cmdExport().catch(reject);

        // NOTE Import section
        if (exportRes) {
          let canCreateStack = false

          if (!config.target_stack) {
            canCreateStack = await inquirer.prompt(stackCreationConfirmation);
          }

          if (canCreateStack.stackCreate !== true) {
            if (!config.target_stack) {
              await handleOrgAndStackSelection(
                'Choose an organization where the destination stack exists: ',
                'Choose the destination stack:',
                false
              )
            }

            if (config.target_stack) {
              this.cloneTypeSelection()
                .then(resolve)
                .catch((error) => reject(error.errorMessage));
            }
          } else {
            const destinationOrg = await this.#handleOrgSelection({
              isSource: false,
              msg: 'Choose an organization where you want to create a stack: '
            }).catch((error) => reject(error.errorMessage))
            const orgUid = orgUidList[destinationOrg.Organization];
            await this.createNewStack(orgUid).catch((error) => {
              return reject(
                error.errorMessage + ' Contact the Organization owner for Stack Creation access.',
              )
            })

            if (config.target_stack) {
              this.cloneTypeSelection()
                .then(resolve)
                .catch(reject)
            }
          }
        }
      }
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
        const organization_uid = orgUidList[answer.Organization];
        const stackList = client.stack().query({ organization_uid }).find();
        stackList
          .then((stacklist) => {
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
      let inputvalue

      if (!config.stackName) {
        inputvalue = await inquirer.prompt(stackName);
      } else {
        inputvalue = { stack: config.stackName }
      }

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
      const choices = [
        'Structure (all modules except entries & assets)',
        'Structure with content (all modules including entries & assets)',
      ]
      const cloneTypeSelection = [{
        choices,
        type: 'list',
        name: 'type',
        message: 'Choose the type of data to clone:'
      }];
      let successMsg
      let selectedValue = {}
      config['data'] = path.join(
        __dirname.split('src')[0],
        'contents', config.sourceStackBranch || ''
      );

      if (!config.cloneType) {
        selectedValue = await inquirer.prompt(cloneTypeSelection);
      }

      if (
        config.cloneType === 'a' ||
        selectedValue.type === 'Structure (all modules except entries & assets)'
      ) {
        config['modules'] = structureList;
        successMsg = 'Stack clone Structure completed'
      } else {
        successMsg = 'Stack clone completed with structure and content'
      }

      this.cmdImport()
        .then(() => resolve(successMsg))
        .catch(reject);
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
          return resolve(true);
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
