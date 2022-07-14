const ora = require('ora');
const path = require('path');
const inquirer = require('inquirer');

let exportCmd = require('@contentstack/cli-cm-export');
let importCmd = require('@contentstack/cli-cm-import');
const { HttpClient } = require('@contentstack/cli-utilities');
let sdkInstance = require('../../lib/util/contentstack-management-sdk');
const defaultConfig = require('@contentstack/cli-cm-export/src/config/default');

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
  message: 'Enter name for the new stack to store the cloned content ?',
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
      const { msg = '', isSource = true } = options || {};
      const orgList = await this.getOrganizationChoices(msg).catch(reject);

      if (orgList) {
        const orgSelected = await inquirer.prompt(orgList);

        if (isSource) {
          config.sourceOrg = orgUidList[orgSelected.Organization];
        } else {
          config.targetOrg = orgUidList[orgSelected.Organization];
        }

        resolve(orgSelected);
      }
    });
  }

  #handleStackSelection(options = {}) {
    return new Promise(async (resolve, reject) => {
      const { org = {}, msg = '', isSource = true } = options || {};
      const stackList = await this.getStack(org, msg, isSource).catch(reject);

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

        resolve(selectedStack);
      }
    });
  }

  #handleBranchSelection = async (options) => {
    return new Promise(async (resolve, reject) => {
      const { api_key, isSource = true, returnBranch = false } = options
      const spinner = ora('Fetching Branches').start();
      try {
        const headers = { api_key }

        if (config.auth_token) {
          headers['authtoken'] = config.auth_token
        } else if (config.management_token) {
          headers['authorization'] = config.management_token
        }

        const baseUrl = defaultConfig.host.startsWith('http')
          ? defaultConfig.host
          : `https://${defaultConfig.host}/v3`;

        const result = await new HttpClient()
          .headers(headers)
          .get(`${baseUrl}/stacks/branches`)
          .then(({ data: { branches } }) => branches)

        // NOTE if want to get only list of branches 
        if (returnBranch) {
          const res = (
            result &&
            Array.isArray(result) &&
            result.length > 0
          ) ? result : []

          resolve(res)
        } else {
          // NOTE list options to use to select branch
          if (
            result &&
            Array.isArray(result) &&
            result.length > 0
          ) {
            spinner.succeed('Fetched Branches');
            const { branch } = await inquirer.prompt({
              type: 'list',
              name: 'branch',
              message: 'Choose an branch',
              choices: result.map(row => row.uid),
            });

            if (isSource) {
              config.sourceStackBranch = branch
            } else {
              config.targetStackBranch = branch
            }
          } else {
            spinner.succeed('No branches found.!');
          }

          resolve()
        }
      } catch (e) {
        spinner.fail();
        reject(e);
      }
    });
  };

  start() {
    return new Promise(async (resolve, reject) => {
      let sourceStack = {};
      const handleOrgAndStackSelection = (orgMsg, stackMsg, isSource = true) => {
        return new Promise(async (_resolve) => {
          const org = await this.#handleOrgSelection({ msg: orgMsg, isSource }).catch((error) =>
            reject(error.errorMessage),
          );

          if (org) {
            await this.#handleStackSelection({
              org,
              isSource,
              msg: stackMsg,
            })
              .then(_resolve)
              .catch((error) => reject(error.errorMessage));
          }
        });
      };

      if (!config.source_stack) {
        // NOTE Export section
        sourceStack = await handleOrgAndStackSelection(
          'Choose an organization where your source stack exists:',
          'Select the source stack',
        );
      }

      if (config.source_stack) {
        await this.#handleBranchSelection({ api_key: config.source_stack })
          .catch(error => {
            console.log(error.message)
          })
      }

      if (config.source_stack) {
        stackName.default = config.stackName || `Copy of ${sourceStack.stack || config.source_alias}`;
        const exportRes = await this.cmdExport().catch(reject);

        if (!config.sourceStackBranch) {
          try {
            const branches = await client.stack({ api_key: config.source_stack }).branch().query().find();

            if (branches && branches.items && branches.items.length) {
              config.sourceStackBranch = 'main';
            }
          } catch (_error) {}
        }

        // NOTE Import section
        if (exportRes) {
          let canCreateStack = false;

          if (!config.target_stack) {
            canCreateStack = await inquirer.prompt(stackCreationConfirmation);
          }

          if (canCreateStack.stackCreate !== true) {
            if (!config.target_stack) {
              await handleOrgAndStackSelection(
                'Choose an organization where the destination stack exists: ',
                'Choose the destination stack:',
                false,
              );
            }

            // NOTE GET list of branches if branches enabled
            if (config.target_stack) {
              await this.#handleBranchSelection({
                isSource: false,
                api_key: config.target_stack
              }).catch(error => {
                console.log(error.message)
              })
            }

            if (config.target_stack) {
              this.cloneTypeSelection()
                .then(resolve)
                .catch((error) => reject(error.errorMessage));
            }
          } else {
            const destinationOrg = await this.#handleOrgSelection({
              isSource: false,
              msg: 'Choose an organization where you want to create a stack: ',
            }).catch((error) => reject(error.errorMessage));
            const orgUid = orgUidList[destinationOrg.Organization];
            await this.createNewStack(orgUid).catch((error) => {
              return reject(error.errorMessage + ' Contact the Organization owner for Stack Creation access.');
            });

            if (config.target_stack) {
              this.cloneTypeSelection().then(resolve).catch(reject);
            }
          }
        }
      }
    })
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
        for (const element of organizations.items) {
          orgUidList[element.name] = element.uid;
          orgChoice.choices.push(element.name);
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
            for (const element of stacklist.items) {
              stackUidList[element.name] = element.api_key;
              masterLocaleList[element.name] = element.master_locale;
              stackChoice.choices.push(element.name);
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
      let inputvalue;

      if (!config.stackName) {
        inputvalue = await inquirer.prompt(stackName);
      } else {
        inputvalue = { stack: config.stackName };
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
      ];
      const cloneTypeSelection = [
        {
          choices,
          type: 'list',
          name: 'type',
          message: 'Choose the type of data to clone:',
        },
      ];
      let successMsg;
      let selectedValue = {};
      config['data'] = path.join(__dirname.split('src')[0], 'contents', config.sourceStackBranch || '');

      if (!config.cloneType) {
        selectedValue = await inquirer.prompt(cloneTypeSelection);
      }

      if (config.cloneType === 'a' || selectedValue.type === 'Structure (all modules except entries & assets)') {
        config['modules'] = structureList;
        successMsg = 'Stack clone Structure completed';
      } else {
        successMsg = 'Stack clone completed with structure and content';
      }

      this.cmdImport()
        .then(() => resolve(successMsg))
        .catch(reject);
    });
  }

  async cmdExport() {
    return new Promise((resolve, reject) => {
      const cmd = ['-k', config.source_stack, '-d', __dirname.split('src')[0] + 'contents'];

      if (config.source_alias) {
        cmd.push('-a', config.source_alias);
      }
      if (config.sourceStackBranch) {
        cmd.push('--branch', config.sourceStackBranch);
      }

      let exportData = exportCmd.run(cmd);
      exportData.then(() => resolve(true)).catch(reject);
    });
  }

  async cmdImport() {
    return new Promise(async (resolve, _reject) => {
      const cmd = ['-c', path.join(__dirname, 'dummyConfig.json')];

      if (config.destination_alias) {
        cmd.push('-a', config.destination_alias);
      }
      if (config.sourceStackBranch) {
        cmd.push('-d', path.join(__dirname, config.sourceStackBranch));
      }
      if (config.targetStackBranch) {
        cmd.push('--branch', config.targetStackBranch);
      }
      if (config.importWebhookStatus) {
        cmd.push('--import-webhook-status', config.importWebhookStatus);
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
