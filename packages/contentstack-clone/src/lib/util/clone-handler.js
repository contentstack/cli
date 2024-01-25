const ora = require('ora');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs');
let { default: exportCmd } = require('@contentstack/cli-cm-export');
let { default: importCmd } = require('@contentstack/cli-cm-import');
const { CustomAbortController } = require('./abort-controller');
const prompt = require('prompt');
const colors = require('@colors/colors/safe');
const cloneDeep = require("lodash/cloneDeep")

const {
  HandleOrgCommand,
  HandleStackCommand,
  HandleDestinationStackCommand,
  HandleExportCommand,
  SetBranchCommand,
  CreateNewStackCommand,
  CloneTypeSelectionCommand,
  Clone,
  HandleBranchCommand,
} = require('../helpers/command-helpers');
const { configHandler } = require('@contentstack/cli-utilities')

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

// Overrides prompt's stop method
prompt.stop = function () {
  if (prompt.stopped) {
    return;
  }
  prompt.emit('stop');
  prompt.stopped = true;
  return prompt;
};

class CloneHandler {
  constructor(opt) {
    config = opt;
    cloneCommand = new Clone();
    this.pathDir = opt.pathDir;
    process.stdin.setMaxListeners(50);
  }
  setClient(managementSDKClient) {
    client = managementSDKClient;
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
    return new Promise(async (resolve, reject) => {
      try {
        const { org = {}, msg = '', isSource = true } = options || {};

        const stackList = await this.getStack(org, msg, isSource).catch(reject);

        if (stackList) {
          this.displayBackOptionMessage();

          const selectedStack = await inquirer.prompt(stackList);
          if (this.executingCommand != 1) {
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

          resolve(selectedStack);
        }
      } catch (error) {
        return reject(error);
      }
    });
  }

  handleBranchSelection = async (options) => {
    const { api_key, isSource = true, returnBranch = false } = options;
    return new Promise(async (resolve, reject) => {
      let spinner;
      try {
        const stackAPIClient = client.stack({
          api_key: config.target_stack ? config.target_stack : config.source_stack,
          management_token: config.management_token,
        });

        // NOTE validate if source branch is exist
        if (isSource && config.sourceStackBranch) {
          await this.validateIfBranchExist(stackAPIClient, true);
          return resolve();
        }

        // NOTE Validate target branch is exist
        if (!isSource && config.targetStackBranch) {
          await this.validateIfBranchExist(stackAPIClient, false);
          return resolve();
        }
        spinner = ora('Fetching Branches').start();
        const result = await stackAPIClient
          .branch()
          .query()
          .find()
          .then(({ items }) => items)
          .catch((_err) => {});

        const condition = result && Array.isArray(result) && result.length > 0;

        // NOTE if want to get only list of branches (Pass param -> returnBranch = true )
        if (returnBranch) {
          resolve(condition ? result : []);
        } else {
          if (condition) {
            spinner.succeed('Fetched Branches');
            const { branch } = await inquirer.prompt({
              type: 'list',
              name: 'branch',
              message: 'Choose a branch',
              choices: result.map((row) => row.uid),
            });
            if (this.executingCommand != 2) {
              return reject();
            }
            if (isSource) {
              config.sourceStackBranch = branch;
            } else {
              config.targetStackBranch = branch;
            }
          } else {
            spinner.succeed('No branches found.!');
          }

          resolve();
        }
      } catch (e) {
        if (spinner) spinner.fail();
        console.error(e && e.message);
        return reject(e);
      }
    });
  };

  async validateIfBranchExist(stackAPIClient, isSource) {
    let spinner;
    const completeSpinner = (msg, method = 'succeed') => {
      spinner[method](msg);
      spinner.stop();
    };
    try {
      const branch = isSource ? config.sourceStackBranch : config.targetStackBranch;
      spinner = ora(`Validation if ${isSource ? 'source' : 'target'} branch exist.!`).start();
      const isBranchExist = await stackAPIClient
        .branch(branch)
        .fetch()
        .then((data) => data);

      if (isBranchExist && typeof isBranchExist === 'object') {
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch verified.!`);
      } else {
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail');
        process.exit();
      }
    } catch (e) {
      completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail');
      throw e;
    }
  }
  displayBackOptionMessage() {
    const ui = new inquirer.ui.BottomBar();
    ui.updateBottomBar(chalk.cyan('\nPress shift & left arrow together to undo the operation\n'));
  }
  setBackKeyPressHandler(backKeyPressHandler) {
    this.backKeyPressHandler = backKeyPressHandler;
  }
  removeBackKeyPressHandler() {
    if (this.backKeyPressHandler) {
      process.stdin.removeListener('keypress', this.backKeyPressHandler);
    }
  }
  setExectingCommand(command) {
    // 0 for org, 1 for stack, 1 for branch, 3 stack cancelled, 4 branch cancelled
    this.executingCommand = command;
  }
  execute() {
    return new Promise(async (resolve, reject) => {
      let keyPressHandler;
      try {
        if (!config.source_stack) {
          const orgMsg = 'Choose an organization where your source stack exists:';
          this.setExectingCommand(0);
          this.removeBackKeyPressHandler();
          const org = await cloneCommand.execute(new HandleOrgCommand({ msg: orgMsg, isSource: true }, this));
          let self = this;
          if (org) {
            keyPressHandler = async function (_ch, key) {
              // executingCommand is a tracking property to determine which method invoked this key press.
              if (key.name === 'left' && key.shift) {
                if (self.executingCommand === 1) {
                  self.setExectingCommand(3);
                } else if (self.executingCommand === 2) {
                  self.setExectingCommand(4);
                }
                config.source_stack = null;
                config.sourceStackBranch = null;
                if (self.executingCommand != 0) {
                  console.clear();
                  await cloneCommand.undo();
                }
              }
            };
            process.stdin.addListener('keypress', keyPressHandler);
            this.setBackKeyPressHandler(keyPressHandler);

            await this.executeStackPrompt({ org, isSource: true, msg: 'Select the source stack' });
          } else {
            return reject('Org not found.');
          }
        } else {
          const exportRes = await cloneCommand.execute(new HandleExportCommand(null, this));
          await cloneCommand.execute(new SetBranchCommand(null, this));

          if (exportRes) {
            this.executeDestination().catch((error) => {
              return reject(error);
            });
          }
        }
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }

  async executeStackPrompt(params = {}) {
    try {
      this.setExectingCommand(1);
      const sourceStack = await cloneCommand.execute(new HandleStackCommand(params, this));
      if (config.source_stack) {
        await this.executeBranchPrompt(params);
      }
      stackName.default = config.stackName || `Copy of ${sourceStack.stack || config.source_alias}`;
    } catch (error) {
      throw error;
    }
  }

  async executeBranchPrompt(parentParams) {
    try {
      this.setExectingCommand(2);
      await cloneCommand.execute(
        new HandleBranchCommand(
          { api_key: config.source_stack },
          this,
          this.executeStackPrompt.bind(this, parentParams),
        ),
      );
      await this.executeExport();
    } catch (error) {
      throw error;
    }
  }

  async executeExport() {
    try {
      const exportRes = await cloneCommand.execute(new HandleExportCommand(null, this));
      await cloneCommand.execute(new SetBranchCommand(null, this));

      if (exportRes) {
        this.executeDestination().catch(() => {
          throw '';
        });
      }
    } catch (error) {
      throw error;
    } finally {
      this.removeBackKeyPressHandler();
    }
  }

  async executeDestination() {
    return new Promise(async (resolve, reject) => {
      let keyPressHandler;
      try {
        let canCreateStack = false;
        if (!config.target_stack) {
          canCreateStack = await inquirer.prompt(stackCreationConfirmation);
        }

        this.setExectingCommand(0);
        this.removeBackKeyPressHandler();

        const orgMsgExistingStack = 'Choose an organization where the destination stack exists: ';
        const orgMsgNewStack = 'Choose an organization where you want to create a stack: ';

        let org;
        if (!config.target_stack) {
          org = await cloneCommand.execute(
            new HandleOrgCommand(
              {
                msg: !canCreateStack.stackCreate ? orgMsgExistingStack : orgMsgNewStack,
              },
              this,
            ),
          );
        }

        const params = { org, canCreateStack };
        if (!config.target_stack) {
          let self = this;
          keyPressHandler = async function (_ch, key) {
            if (key.name === 'left' && key.shift) {
              if (self.executingCommand === 1) {
                self.setExectingCommand(3);
              } else if (self.executingCommand === 2) {
                self.setExectingCommand(4);
              }
              if (self.createNewStackPrompt) {
                self.createNewStackPrompt.stop();
              }
              config.target_stack = null;
              config.targetStackBranch = null;
              if (self.executingCommand != 0) {
                console.clear();
                await cloneCommand.undo();
              }
            }
          };
          process.stdin.addListener('keypress', keyPressHandler);
          this.setBackKeyPressHandler(keyPressHandler);
          await this.executeStackDestinationPrompt(params);
        } else {
          await this.executeBranchDestinationPrompt(params);
        }

        return resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async executeStackDestinationPrompt(params) {
    try {
      this.setExectingCommand(1);
      const { org, canCreateStack } = params;
      if (!canCreateStack.stackCreate) {
        const stackMsg = 'Choose the destination stack:';
        await cloneCommand.execute(new HandleDestinationStackCommand({ org, msg: stackMsg, isSource: false }, this));
        this.executeBranchDestinationPrompt(params);
      } else {
        const orgUid = orgUidList[org.Organization];
        await cloneCommand.execute(new CreateNewStackCommand({ orgUid }, this));
        this.removeBackKeyPressHandler();
        await cloneCommand.execute(new CloneTypeSelectionCommand(null, this));
      }
    } catch (error) {
      throw error;
    }
  }

  async executeBranchDestinationPrompt(parentParams) {
    try {
      this.setExectingCommand(2);
      await cloneCommand.execute(
        new HandleBranchCommand(
          { isSource: false, api_key: config.target_stack },
          this,
          this.executeStackDestinationPrompt.bind(this, parentParams),
        ),
      );
      this.removeBackKeyPressHandler();
      await cloneCommand.execute(new CloneTypeSelectionCommand(null, this));
    } catch (error) {
      throw error;
    }
  }

  setCreateNewStackPrompt(createNewStackPrompt) {
    this.createNewStackPrompt = createNewStackPrompt;
  }

  async setBranch() {
    if (!config.sourceStackBranch) {
      try {
        const branches = await client
          .stack({ api_key: config.source_stack })
          .branch()
          .query()
          .find()
          .catch((_err) => {});

        if (branches && branches.items && branches.items.length) {
          config.sourceStackBranch = 'main';
        }
      } catch (_error) {}
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
        let organizations;
        const configOrgUid = configHandler.get('oauthOrgUid');

        if (configOrgUid) {
          organizations = await client.organization(configOrgUid).fetch();
        } else {
          organizations = await client.organization().fetchAll({ limit: 100 });
        }
        
        spinner.succeed('Fetched Organization');
        for (const element of organizations.items || [organizations]) {
          orgUidList[element.name] = element.uid;
          orgChoice.choices.push(element.name);
        }
        return resolve(orgChoice);
      } catch (e) {
        spinner.fail();
        return reject(e);
      }
    });
  }

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
  }

  async createNewStack(options) {
    return new Promise(async (resolve, reject) => {
      try {
        const { orgUid } = options;
        this.displayBackOptionMessage();
        let inputvalue;
        if (!config.stackName) {
          prompt.start();
          prompt.message = '';
          this.setCreateNewStackPrompt(prompt);
          inputvalue = await this.getNewStackPromptResult();
          this.setCreateNewStackPrompt(null);
        } else {
          inputvalue = { stack: config.stackName };
        }
        if (this.executingCommand === 0 || !inputvalue) {
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
      }
    });
  }

  getNewStackPromptResult() {
    return new Promise((resolve) => {
      prompt.get(
        {
          properties: {
            name: { description: colors.white(stackName.message), default: colors.grey(stackName.default) },
          },
        },
        function (_, result) {
          if (prompt.stopped) {
            prompt.stopped = false;
            resolve();
          } else {
            let _name = result.name.replace(/\[\d+m/g, '');
            _name = _name.replace(//g, '');
            resolve({ stack: _name });
          }
        },
      );
    });
  }

  async cloneTypeSelection() {
    console.clear();
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
      // Creating export specific config by merging external configurations
      let exportConfig = Object.assign({}, cloneDeep(config), {...config?.export});
      delete exportConfig.import;
      delete exportConfig.export;

      const cmd = ['-k', exportConfig.source_stack, '-d', __dirname.split('src')[0] + 'contents'];
      if (exportConfig.cloneType === 'a') {
        exportConfig.filteredModules = ['stack'].concat(structureList);
      }

      if (exportConfig.source_alias) {
        cmd.push('-a', exportConfig.source_alias);
      }
      if (exportConfig.sourceStackBranch) {
        cmd.push('--branch', exportConfig.sourceStackBranch);
      }

      if (exportConfig.forceStopMarketplaceAppsPrompt) cmd.push('-y');

      cmd.push('-c');
      cmd.push(path.join(__dirname, 'dummyConfig.json'));

      fs.writeFileSync(path.join(__dirname, 'dummyConfig.json'), JSON.stringify(exportConfig));
      let exportData = exportCmd.run(cmd);
      exportData.then(() => resolve(true)).catch(reject);
    });
  }

  async cmdImport() {
    return new Promise(async (resolve, _reject) => {
      // Creating export specific config by merging external configurations
      let importConfig = Object.assign({}, cloneDeep(config), {...config?.import});
      delete importConfig.import;
      delete importConfig.export;

      const cmd = ['-c', path.join(__dirname, 'dummyConfig.json')];

      if (importConfig.destination_alias) {
        cmd.push('-a', importConfig.destination_alias);
      }
      if (!importConfig.data && importConfig.sourceStackBranch) {
        cmd.push('-d', path.join(importConfig.pathDir, importConfig.sourceStackBranch));
      }
      if (importConfig.targetStackBranch) {
        cmd.push('--branch', importConfig.targetStackBranch);
      }
      if (importConfig.importWebhookStatus) {
        cmd.push('--import-webhook-status', importConfig.importWebhookStatus);
      }

      if (importConfig.skipAudit) cmd.push('--skip-audit');

      if (importConfig.forceStopMarketplaceAppsPrompt) cmd.push('-y');

      fs.writeFileSync(path.join(__dirname, 'dummyConfig.json'), JSON.stringify(importConfig));
      await importCmd.run(cmd);
      fs.writeFileSync(path.join(__dirname, 'dummyConfig.json'), JSON.stringify({}))
      return resolve();
    });
  }
}

module.exports = {
  CloneHandler,
  client,
};
