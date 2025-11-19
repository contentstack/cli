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
const cloneDeep = require('lodash/cloneDeep');

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
const { configHandler, getBranchFromAlias, log } = require('@contentstack/cli-utilities');

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
    log.debug('Initializing CloneHandler', config.cloneContext, { pathDir: opt.pathDir, cloneType: opt.cloneType });
  }
  setClient(managementSDKClient) {
    client = managementSDKClient;
  }

  handleOrgSelection(options = {}) {
    return new Promise(async (resolve, reject) => {
      const { msg = '', isSource = true } = options || {};
      log.debug('Handling organization selection', config.cloneContext);
      const orgList = await this.getOrganizationChoices(msg).catch(reject);

        if (orgList) {
          log.debug(`Found ${orgList.choices?.length || 0} organization(s) to choose from`, config.cloneContext);
          const orgSelected = await inquirer.prompt(orgList);
          log.debug(`Organization selected: ${orgSelected.Organization}`, config.cloneContext);

          if (isSource) {
            config.sourceOrg = orgUidList[orgSelected.Organization];
            log.debug(`Source organization UID: ${config.sourceOrg}`, config.cloneContext);
          } else {
            config.targetOrg = orgUidList[orgSelected.Organization];
            log.debug(`Target organization UID: ${config.targetOrg}`, config.cloneContext);
          }

          resolve(orgSelected);
        }
    });
  }

  handleStackSelection(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const { org = {}, msg = '', isSource = true } = options || {};
        log.debug('Handling stack selection', config.cloneContext, { isSource, orgName: org.Organization, msg });

        const stackList = await this.getStack(org, msg, isSource).catch(reject);

        if (stackList) {
          this.displayBackOptionMessage();

          log.debug(`Found ${stackList.choices?.length || 0} stack(s) to choose from`, config.cloneContext);
          const selectedStack = await inquirer.prompt(stackList);
          log.debug(`Stack selected: ${selectedStack.stack}`, config.cloneContext);
          if (this.executingCommand != 1) {
            return reject();
          }
          if (isSource) {
            config.sourceStackName = selectedStack.stack;
            master_locale = masterLocaleList[selectedStack.stack];
            config.source_stack = stackUidList[selectedStack.stack];
            log.debug(`Source stack configured`, config.cloneContext);
          } else {
            config.target_stack = stackUidList[selectedStack.stack];
            config.destinationStackName = selectedStack.stack;
            log.debug(`Target stack configured`, config.cloneContext);
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
        log.debug('Handling branch selection', config.cloneContext, { isSource, returnBranch, stackApiKey: isSource ? config.source_stack : config.target_stack });
        const stackAPIClient = client.stack({
          api_key: isSource ? config.source_stack : config.target_stack,
          management_token: config.management_token,
        });

        // NOTE validate if source branch is exist
        if (isSource && config.sourceStackBranch) {
          log.debug('Validating source branch exists', config.cloneContext, { branch: config.sourceStackBranch });
          await this.validateIfBranchExist(stackAPIClient, true);
          return resolve();
        } else if(isSource && config.sourceStackBranchAlias) {
          log.debug('Resolving source branch alias', config.cloneContext, { alias: config.sourceStackBranchAlias });
          await this.resolveBranchAliases(true);
          return resolve();
        }

        // NOTE Validate target branch is exist
        if (!isSource && config.targetStackBranch) {
          log.debug('Validating target branch exists', config.cloneContext, { branch: config.targetStackBranch });
          await this.validateIfBranchExist(stackAPIClient, false);
          return resolve();
        } else if (!isSource && config.targetStackBranchAlias) {
          log.debug('Resolving target branch alias', config.cloneContext, { alias: config.targetStackBranchAlias });
          await this.resolveBranchAliases();
          return resolve();
        }
        spinner = ora('Fetching Branches').start();
        log.debug(`Querying branches for stack: ${isSource ? config.source_stack : config.target_stack}`, config.cloneContext);
        const result = await stackAPIClient
          .branch()
          .query()
          .find()
          .then(({ items }) => items)
          .catch((_err) => {});

        const condition = result && Array.isArray(result) && result.length > 0;
        log.debug(`Found ${result?.length || 0} branch(es)`, config.cloneContext);

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
              log.debug(`Source branch selected: ${branch}`, config.cloneContext);
            } else {
              config.targetStackBranch = branch;
              log.debug(`Target branch selected: ${branch}`, config.cloneContext);
            }
          } else {
            spinner.succeed('No branches found.!');
          }

          resolve();
        }
      } catch (e) {
        if (spinner) spinner.fail();
        log.error('Error in handleBranchSelection', config.cloneContext, { error: e && e.message, isSource });
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
      log.debug('Validating branch existence', config.cloneContext);
      spinner = ora(`Validation if ${isSource ? 'source' : 'target'} branch exist.!`).start();
      const isBranchExist = await stackAPIClient
        .branch(branch)
        .fetch()
        .then((data) => data);

      if (isBranchExist && typeof isBranchExist === 'object') {
        log.debug('Branch validation successful', config.cloneContext);
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch verified.!`);
      } else {
        log.error('Branch not found', config.cloneContext);
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail');
        process.exit();
      }
    } catch (e) {
      log.error('Branch validation failed', config.cloneContext, { isSource, branch, error: e.message });
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
        log.debug('Starting clone execution', config.cloneContext, { sourceStack: config.source_stack, targetStack: config.target_stack });
        if (!config.source_stack) {
          const orgMsg = 'Choose an organization where your source stack exists:';
          log.debug('Source stack not provided, prompting for organization', config.cloneContext);
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
          log.debug('Source stack provided, proceeding with branch selection and export', config.cloneContext);
          this.setExectingCommand(2);
          await this.handleBranchSelection({ api_key: config.sourceStack });
          log.debug('Starting export operation', config.cloneContext);
          const exportRes = await cloneCommand.execute(new HandleExportCommand(null, this));
          await cloneCommand.execute(new SetBranchCommand(null, this));

          if (exportRes) {
            log.debug('Export completed, proceeding with destination setup', config.cloneContext);
            this.executeDestination().catch((error) => {
              return reject(error);
            });
          }
        }
        log.debug('Clone execution completed successfully', config.cloneContext);
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
      log.debug('Executing export operation', config.cloneContext);
      const exportRes = await cloneCommand.execute(new HandleExportCommand(null, this));
      await cloneCommand.execute(new SetBranchCommand(null, this));

      if (exportRes) {
        log.debug('Export operation completed, proceeding with destination', config.cloneContext);
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
        log.debug('Executing destination setup', config.cloneContext);
        let canCreateStack = false;
        if (!config.target_stack) {
          log.debug('Target stack not provided, prompting for stack creation', config.cloneContext);
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

        log.debug('Destination setup completed successfully', config.cloneContext);
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
      log.debug('Fetching organization choices', config.cloneContext);
      const spinner = ora('Fetching Organization').start();
      try {
        let organizations;
        const configOrgUid = configHandler.get('oauthOrgUid');
        log.debug('Getting organizations', config.cloneContext, { hasConfigOrgUid: !!configOrgUid });

        if (configOrgUid) {
          organizations = await client.organization(configOrgUid).fetch();
        } else {
          organizations = await client.organization().fetchAll({ limit: 100 });
        }

        spinner.succeed('Fetched Organization');
        const orgCount = organizations.items ? organizations.items.length : 1;
        log.debug('Fetched organizations', config.cloneContext);
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
      log.debug('Fetching stacks', config.cloneContext);
      const spinner = ora('Fetching stacks').start();
      try {
        const organization_uid = orgUidList[answer.Organization];
        log.debug('Querying stacks for organization', config.cloneContext, { organizationUid: organization_uid });
        const stackList = client.stack().query({ organization_uid }).find();
        stackList
          .then((stacklist) => {
            log.debug('Fetched stacks', config.cloneContext, { count: stacklist.items ? stacklist.items.length : 0 });
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
            log.error('Failed to fetch stacks', { error: error.message || error });
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
        log.debug('Creating new stack', config.cloneContext, { orgUid, masterLocale: master_locale, stackName: config.stackName });
        this.displayBackOptionMessage();
        let inputvalue;
        if (!config.stackName) {
          log.debug('Stack name not provided, prompting user', config.cloneContext);
          prompt.start();
          prompt.message = '';
          this.setCreateNewStackPrompt(prompt);
          inputvalue = await this.getNewStackPromptResult();
          this.setCreateNewStackPrompt(null);
        } else {
          inputvalue = { stack: config.stackName };
        }
        if (this.executingCommand === 0 || !inputvalue) {
          log.debug('Stack creation cancelled or invalid input', config.cloneContext);
          return reject();
        }

        let stack = { name: inputvalue.stack, master_locale: master_locale };
        log.debug('Creating stack with configuration', config.cloneContext);
        const spinner = ora('Creating New stack').start();
        log.debug('Sending stack creation API request', config.cloneContext);
        let newStack = client.stack().create({ stack }, { organization_uid: orgUid });
        newStack
          .then((result) => {
            log.debug('Stack created successfully', config.cloneContext, { 
              stackName: result.name,
            });
            spinner.succeed('New Stack created Successfully name as ' + result.name);
            config.target_stack = result.api_key;
            config.destinationStackName = result.name;
            log.debug('Target stack configuration updated', config.cloneContext);
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

  async resolveBranchAliases(isSource = false) {
    try {
      log.debug('Resolving branch aliases', config.cloneContext, { isSource, alias: isSource ? config.sourceStackBranchAlias : config.targetStackBranchAlias });
      if (isSource) {
        const sourceStack = client.stack({ api_key: config.source_stack });
        config.sourceStackBranch = await getBranchFromAlias(sourceStack, config.sourceStackBranchAlias);
        log.debug('Source branch alias resolved', config.cloneContext, { alias: config.sourceStackBranchAlias, branch: config.sourceStackBranch });
      } else {
        const targetStack = client.stack({ api_key: config.target_stack });
        config.targetStackBranch = await getBranchFromAlias(targetStack, config.targetStackBranchAlias);
        log.debug('Target branch alias resolved', config.cloneContext, { alias: config.targetStackBranchAlias, branch: config.targetStackBranch });
      }
    } catch (error) {
      throw error;
    }
  }

  async cloneTypeSelection() {
    console.clear();
    return new Promise(async (resolve, reject) => {
      log.debug('Starting clone type selection', config.cloneContext);
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
      log.debug(`Clone data directory: ${config['data']}`, config.cloneContext);

      if (!config.cloneType) {
        log.debug('Clone type not specified, prompting user for selection', config.cloneContext);
        selectedValue = await inquirer.prompt(cloneTypeSelection);
      } else {
        log.debug(`Using pre-configured clone type: ${config.cloneType}`, config.cloneContext);
      }

      if (config.cloneType === 'a' || selectedValue.type === 'Structure (all modules except entries & assets)') {
        config['modules'] = structureList;
        successMsg = 'Stack clone Structure completed';
        log.debug(`Clone type: Structure only. Modules to clone: ${structureList.join(', ')}`, config.cloneContext);
      } else {
        successMsg = 'Stack clone completed with structure and content';
        log.debug('Clone type: Structure with content (all modules)', config.cloneContext);
      }

      this.cmdImport()
        .then(() => {
          log.debug('Clone type selection and import completed successfully', config.cloneContext);
          resolve(successMsg);
        })
        .catch(reject);
    });
  }

  async cmdExport() {
    return new Promise((resolve, reject) => {
      log.debug('Preparing export command', config.cloneContext, { sourceStack: config.source_stack, cloneType: config.cloneType });
      // Creating export specific config by merging external configurations
      let exportConfig = Object.assign({}, cloneDeep(config), { ...config?.export });
      delete exportConfig.import;
      delete exportConfig.export;

      const exportDir = __dirname.split('src')[0] + 'contents';
      log.debug(`Export directory: ${exportDir}`, config.cloneContext);
      const cmd = ['-k', exportConfig.source_stack, '-d', exportDir];
      
      if (exportConfig.cloneType === 'a') {
        exportConfig.filteredModules = ['stack'].concat(structureList);
        log.debug(`Filtered modules for structure-only export: ${exportConfig.filteredModules.join(', ')}`, config.cloneContext);
      }

      if (exportConfig.source_alias) {
        cmd.push('-a', exportConfig.source_alias);
        log.debug(`Using source alias: ${exportConfig.source_alias}`, config.cloneContext);
      }
      if (exportConfig.sourceStackBranch) {
        cmd.push('--branch', exportConfig.sourceStackBranch);
        log.debug(`Using source branch: ${exportConfig.sourceStackBranch}`, config.cloneContext);
      }

      if (exportConfig.forceStopMarketplaceAppsPrompt) {
        cmd.push('-y');
        log.debug('Force stop marketplace apps prompt enabled', config.cloneContext);
      }

      const configFilePath = path.join(__dirname, 'dummyConfig.json');
      cmd.push('-c');
      cmd.push(configFilePath);
      log.debug(`Writing export config to: ${configFilePath}`, config.cloneContext);

      fs.writeFileSync(configFilePath, JSON.stringify(exportConfig));
      log.debug('Export command prepared', config.cloneContext, { 
        cmd: cmd.join(' '),
        exportDir,
        sourceStack: exportConfig.source_stack,
        branch: exportConfig.sourceStackBranch 
      });
      log.debug('Running export command', config.cloneContext, { cmd });
      let exportData = exportCmd.run(cmd);
      exportData.then(() => {
        log.debug('Export command completed successfully', config.cloneContext);
        resolve(true);
      }).catch((error) => {
        log.error('Export command failed', config.cloneContext, { error: error.message || error });
        reject(error);
      });
    });
  }

  async cmdImport() {
    return new Promise(async (resolve, _reject) => {
      log.debug('Preparing import command', config.cloneContext, { targetStack: config.target_stack, targetBranch: config.targetStackBranch });
      // Creating export specific config by merging external configurations
      let importConfig = Object.assign({}, cloneDeep(config), { ...config?.import });
      delete importConfig.import;
      delete importConfig.export;

      const configFilePath = path.join(__dirname, 'dummyConfig.json');
      const cmd = ['-c', configFilePath];

      if (importConfig.destination_alias) {
        cmd.push('-a', importConfig.destination_alias);
        log.debug(`Using destination alias: ${importConfig.destination_alias}`, config.cloneContext);
      }
      if (!importConfig.data && importConfig.sourceStackBranch) {
        const dataPath = path.join(importConfig.pathDir, importConfig.sourceStackBranch);
        cmd.push('-d', dataPath);
        log.debug(`Import data path: ${dataPath}`, config.cloneContext);
      }
      if (importConfig.targetStackBranch) {
        cmd.push('--branch', importConfig.targetStackBranch);
        log.debug(`Using target branch: ${importConfig.targetStackBranch}`, config.cloneContext);
      }
      if (importConfig.importWebhookStatus) {
        cmd.push('--import-webhook-status', importConfig.importWebhookStatus);
        log.debug(`Import webhook status: ${importConfig.importWebhookStatus}`, config.cloneContext);
      }

      if (importConfig.skipAudit) {
        cmd.push('--skip-audit');
        log.debug('Skip audit flag enabled', config.cloneContext);
      }

      if (importConfig.forceStopMarketplaceAppsPrompt) {
        cmd.push('-y');
        log.debug('Force stop marketplace apps prompt enabled', config.cloneContext);
      }

      log.debug(`Writing import config to: ${configFilePath}`, config.cloneContext);
      fs.writeFileSync(configFilePath, JSON.stringify(importConfig));
      log.debug('Import command prepared', config.cloneContext, { 
        cmd: cmd.join(' '),
        targetStack: importConfig.target_stack,
        targetBranch: importConfig.targetStackBranch,
        dataPath: importConfig.data || path.join(importConfig.pathDir, importConfig.sourceStackBranch)
      });
      log.debug('Running import command', config.cloneContext, { cmd });
      await importCmd.run(cmd);
      log.debug('Import command completed successfully', config.cloneContext);
      log.debug('Clearing import config file', config.cloneContext);
      fs.writeFileSync(configFilePath, JSON.stringify({}));
      return resolve();
    });
  }
}

module.exports = {
  CloneHandler,
  client,
};
