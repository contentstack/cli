const ora = require('ora');
const path = require('path');
const inquirer = require('inquirer');
const rimraf = require('rimraf');
const chalk = require('chalk');

let exportCmd = require('@contentstack/cli-cm-export');
let importCmd = require('@contentstack/cli-cm-import');
const { HttpClient } = require('@contentstack/cli-utilities');
let sdkInstance = require('../../lib/util/contentstack-management-sdk');
const defaultConfig = require('@contentstack/cli-cm-export/src/config/default');
const { CustomAbortController } = require('./abort-controller');

const {
  HandleOrgCommand, HandleStackCommand, HandleDestinationStackCommand, HandleExportCommand,
  SetBranchCommand, CreateNewStackCommand, CloneTypeSelectionCommand, Clone, HandleBranchCommand
} = require('../helpers/command-helpers');

let client = {};
let config;
let cloneCommand;

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
  'marketplace-apps',
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
    cloneCommand = new Clone();
    this.pathDir = opt.pathDir;
    process.stdin.setMaxListeners(50);
  }

  handleOrgSelection(options = {}) {
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

  handleStackSelection(options = {}) {
    let keyPressHandler;
    return new Promise(async (resolve, reject) => {
      try {
        const { org = {}, msg = '', isSource = true, stackAbortController } = options || {}

        keyPressHandler = async function (_ch, key) {
          if (key.name === 'left' && key.shift) {
            stackAbortController.abort();
            console.clear();
            process.stdin.removeListener('keypress', keyPressHandler);
            await cloneCommand.undo();
          }
        };
        process.stdin.addListener('keypress', keyPressHandler);

        const stackList = await this.getStack(org, msg, isSource).catch(reject)

        if (stackList) {
          const ui = new inquirer.ui.BottomBar();
          ui.updateBottomBar(chalk.cyan('\nPress shift & left arrow together to undo the operation\n'));

          const selectedStack = await inquirer.prompt(stackList);

          if (stackAbortController.signal.aborted) {
            return reject();
          }
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
      } catch (error) {
        return reject(error);
      } finally {
        if (keyPressHandler) {
          process.stdin.removeListener('keypress', keyPressHandler);
        }
      }
    });
  }

  handleBranchSelection = async (options) => {
    const { api_key, isSource = true, returnBranch = false } = options
    const baseUrl = defaultConfig.host.startsWith('http')
      ? defaultConfig.host
      : `https://${defaultConfig.host}/v3`;

    return new Promise(async (resolve, reject) => {
      try {
        const headers = { api_key }

        if (config.auth_token) {
          headers['authtoken'] = config.auth_token
        } else if (config.management_token) {
          headers['authorization'] = config.management_token
        }

        // NOTE validate if source branch is exist
        if (isSource && config.sourceStackBranch) {
          await this.validateIfBranchExist(headers, true)
          return resolve()
        }

        // NOTE Validate target branch is exist
        if (!isSource && config.targetStackBranch) {
          await this.validateIfBranchExist(headers, false)
          return resolve()
        }

        const spinner = ora('Fetching Branches').start();
        const result = await new HttpClient()
          .headers(headers)
          .get(`${baseUrl}/stacks/branches`)
          .then(({ data: { branches } }) => branches)

        const condition = (
          result &&
          Array.isArray(result) &&
          result.length > 0
        )

        // NOTE if want to get only list of branches (Pass param -> returnBranch = true )
        if (returnBranch) {
          resolve(condition ? result : [])
        } else {
          // NOTE list options to use to select branch
          if (condition) {
            spinner.succeed('Fetched Branches');
            const { branch } = await inquirer.prompt({
              type: 'list',
              name: 'branch',
              message: 'Choose a branch',
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
        console.log(e && e.message)
        resolve()
      }
    })
  }

  async validateIfBranchExist(headers, isSource) {
    const branch = isSource ? config.sourceStackBranch : config.targetStackBranch
    const spinner = ora(`Validation if ${isSource ? 'source' : 'target'} branch exist.!`).start();
    const isBranchExist = await HttpClient.create()
      .headers(headers)
      .get(`https://${config.host}/v3/stacks/branches/${branch}`)
      .then(({ data }) => data);

    const completeSpinner = (msg, method = 'succeed') => {
      spinner[method](msg)
      spinner.stop()
    }

    if (isBranchExist && typeof isBranchExist === 'object' && typeof isBranchExist.branch === 'object') {
      completeSpinner(`${isSource ? 'Source' : 'Target'} branch verified.!`)
    } else {
      completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail')
      process.exit()
    }
  }

  execute() {
    return new Promise(async (resolve, reject) => {
      let stackAbortController;

      try {
        if (!config.source_stack) {
          const orgMsg = 'Choose an organization where your source stack exists:';
          const stackMsg = 'Select the source stack';

          stackAbortController = new CustomAbortController();

          const org = await cloneCommand.execute(new HandleOrgCommand({ msg: orgMsg, isSource: true }, this));
          if (org) {
            const sourceStack = await cloneCommand.execute(new HandleStackCommand({ org, isSource: true, msg: stackMsg, stackAbortController }, this));

            if (config.source_stack) {
              await cloneCommand.execute(
                new HandleBranchCommand({ api_key: config.source_stack }, this)
              );
            }

            if (stackAbortController.signal.aborted) {
              return reject();
            }
            stackName.default = config.stackName || `Copy of ${sourceStack.stack || config.source_alias}`;
          } else {
            return reject('Org not found.');
          }
        }
        const exportRes = await cloneCommand.execute(new HandleExportCommand(null, this));
        await cloneCommand.execute(new SetBranchCommand(null, this));

        if (exportRes) {
          this.executeDestination().catch(() => { reject(); });
        }
        return resolve();
      } catch (error) {
        return reject(error);
      } finally {
        if (stackAbortController) {
          stackAbortController.abort();
        }
      }
    });
  }

  async executeDestination() {
    return new Promise(async (resolve, reject) => {
      let stackAbortController;
      try {
        stackAbortController = new CustomAbortController();

        let canCreateStack = false;

        if (!config.target_stack) {
          canCreateStack = await inquirer.prompt(stackCreationConfirmation);
        }

        if (!canCreateStack.stackCreate) {
          if (!config.target_stack) {
            const orgMsg = 'Choose an organization where the destination stack exists: ';
            const org = await cloneCommand.execute(new HandleOrgCommand({ msg: orgMsg }, this));

            if (org) {
              const stackMsg = 'Choose the destination stack:';
              await cloneCommand.execute(new HandleDestinationStackCommand({ org, msg: stackMsg, stackAbortController, isSource: false }, this));
            }
          }

          // NOTE GET list of branches if branches enabled
          if (config.target_stack) {
            await cloneCommand.execute(new HandleBranchCommand({ isSource: false, api_key: config.target_stack }, this));
          }
        } else {
          const orgMsg = 'Choose an organization where you want to create a stack: ';
          const destinationOrg = await cloneCommand.execute(new HandleOrgCommand({ msg: orgMsg }, this));
          const orgUid = orgUidList[destinationOrg.Organization];
          await cloneCommand.execute(new CreateNewStackCommand({ orgUid, stackAbortController }, this));
        }
        await cloneCommand.execute(new CloneTypeSelectionCommand(null, this));
        return resolve();
      } catch (error) {
        reject(error);
      } finally {
        // If not aborted and ran successfully
        if (!stackAbortController.signal.aborted) {
          // Call clean dir.
          rimraf(this.pathDir, function () {
            // eslint-disable-next-line no-console
            console.log('Stack cloning process have been completed successfully');
          });
        }
      }
    })
  }

  async setBranch() {
    if (!config.sourceStackBranch) {
      try {
        const branches = await client.stack({ api_key: config.source_stack }).branch().query().find();

        if (branches && branches.items && branches.items.length) {
          config.sourceStackBranch = 'main';
        }
      } catch (_error) { }
    }
  }

  async getOrganizationChoices(orgMessage) {
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

  async getStack(answer, stkMessage) {
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

  async createNewStack(options) {
    let keyPressHandler;
    return new Promise(async (resolve, reject) => {
      try {
        const { orgUid, stackAbortController } = options;
        let inputvalue;
        let uiPromise;

        keyPressHandler = async function (_ch, key) {
          if (key.name === 'left' && key.shift) {
            stackAbortController.abort();
            // We need to close the inquirer promise correctly, otherwise the unclosed question/answer text is displayed in next line.
            if (uiPromise) {
              uiPromise.ui.close();
            }
            console.clear();
            process.stdin.removeListener('keypress', keyPressHandler);
            await cloneCommand.undo();
          }
        };
        process.stdin.addListener('keypress', keyPressHandler);

        const ui = new inquirer.ui.BottomBar();
        ui.updateBottomBar(chalk.cyan('\nPress shift & left arrow together to undo the operation\n'));

        if (!config.stackName) {
          uiPromise = inquirer.prompt(stackName);
          inputvalue = await uiPromise;
        } else {
          inputvalue = { stack: config.stackName };
        }

        if (stackAbortController.signal.aborted) {
          return reject();
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
            return reject(error.errorMessage + ' Contact the Organization owner for Stack Creation access.');
          });
      } catch (error) {
        return reject(error);
      } finally {
        if (keyPressHandler) {
          process.stdin.removeListener('keypress', keyPressHandler);
        }
      }
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

      if (config.forceMarketplaceAppsImport) cmd.push('-y')

      await importCmd.run(cmd);
      return resolve();
    });
  }
}

module.exports = {
  CloneHandler,
  client,
};
