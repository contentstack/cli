import { Ora, default as ora } from 'ora';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import { CustomAbortController } from './abort-controller';
import exportCmd from '@contentstack/cli-cm-export';
import importCmd from '@contentstack/cli-cm-import';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prompt = require('prompt');
import colors from '@colors/colors/safe';
import cloneDeep from 'lodash/cloneDeep';
import { configHandler, getBranchFromAlias, log } from '@contentstack/cli-utilities';

import {
  HandleOrgCommand,
  HandleStackCommand,
  HandleDestinationStackCommand,
  HandleExportCommand,
  SetBranchCommand,
  CreateNewStackCommand,
  CloneTypeSelectionCommand,
  Clone,
  HandleBranchCommand,
} from '../helpers/command-helpers';
import { CloneConfig } from '../../types/clone-config';
import { STRUCTURE_LIST, STACK_CREATION_CONFIRMATION, STACK_NAME_PROMPT } from '../../utils/constants';

// Override prompt's stop method
(prompt as any).stop = function () {
  if ((prompt as any).stopped) {
    return;
  }
  (prompt as any).emit('stop');
  (prompt as any).stopped = true;
  return prompt;
};

export class CloneHandler {
  private config: CloneConfig;
  private client: any; // ContentstackClient from cli-utilities
  private cloneCommand: Clone;
  public pathDir: string;
  private orgUidList: Record<string, string> = {};
  private stackUidList: Record<string, string> = {};
  private masterLocaleList: Record<string, string> = {};
  private master_locale?: string;
  private executingCommand?: number;
  private backKeyPressHandler?: (...args: any[]) => void;
  private createNewStackPrompt?: any;
  private stackNamePrompt: { type: string; name: string; default: string; message: string };

  constructor(opt: CloneConfig) {
    this.config = opt;
    this.cloneCommand = new Clone();
    this.pathDir = opt.pathDir || '';
    // Create mutable copy of stack name prompt for dynamic default updates
    this.stackNamePrompt = {
      type: STACK_NAME_PROMPT.type,
      name: STACK_NAME_PROMPT.name,
      default: STACK_NAME_PROMPT.default,
      message: STACK_NAME_PROMPT.message,
    };
    process.stdin.setMaxListeners(50);
    log.debug('Initializing CloneHandler', { 
      ...this.config.cloneContext,
      pathDir: opt.pathDir, 
      cloneType: opt.cloneType 
    });
  }

  setClient(managementSDKClient: any): void {
    this.client = managementSDKClient;
  }

  async getOrganizationChoices(orgMessage?: string): Promise<any> {
    const orgChoice = {
      type: 'list',
      name: 'Organization',
      message: orgMessage !== undefined ? orgMessage : 'Choose an organization',
      choices: [] as string[],
    };
    return new Promise(async (resolve, reject) => {
      log.debug('Fetching organization choices', this.config.cloneContext);
      const spinner = ora('Fetching Organization').start();
      try {
        let organizations: any;
        const configOrgUid = configHandler.get('oauthOrgUid');
        log.debug('Getting organizations', { ...this.config.cloneContext, hasConfigOrgUid: !!configOrgUid });

        if (configOrgUid) {
          organizations = await this.client.organization(configOrgUid).fetch();
        } else {
          organizations = await this.client.organization().fetchAll({ limit: 100 });
        }

        spinner.succeed('Fetched Organization');
        log.debug('Fetched organizations', this.config.cloneContext);
        for (const element of organizations.items || [organizations]) {
          this.orgUidList[element.name] = element.uid;
          orgChoice.choices.push(element.name);
        }
        return resolve(orgChoice);
      } catch (e) {
        spinner.fail();
        return reject(e);
      }
    });
  }

  async handleOrgSelection(options: { msg?: string; isSource?: boolean } = {}): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const { msg = '', isSource = true } = options || {};
      log.debug('Handling organization selection', this.config.cloneContext);
      const orgList = await this.getOrganizationChoices(msg).catch(reject);

      if (orgList) {
        log.debug(`Found ${orgList.choices?.length || 0} organization(s) to choose from`, this.config.cloneContext);
        const orgSelected = await inquirer.prompt(orgList);
        log.debug(`Organization selected: ${orgSelected.Organization}`, this.config.cloneContext);

        if (isSource) {
          this.config.sourceOrg = this.orgUidList[orgSelected.Organization];
          log.debug(`Source organization UID: ${this.config.sourceOrg}`, this.config.cloneContext);
        } else {
          this.config.targetOrg = this.orgUidList[orgSelected.Organization];
          log.debug(`Target organization UID: ${this.config.targetOrg}`, this.config.cloneContext);
        }

        resolve(orgSelected);
      }
    });
  }

  async getStack(answer: any, stkMessage?: string, isSource: boolean = true): Promise<any> {
    const stackChoice = {
      type: 'list',
      name: 'stack',
      message: stkMessage !== undefined ? stkMessage : 'Select the stack',
      choices: [] as string[],
    };
    return new Promise(async (resolve, reject) => {
      log.debug('Fetching stacks', this.config.cloneContext);
      const spinner = ora('Fetching stacks').start();
      try {
        const organization_uid = this.orgUidList[answer.Organization];
        log.debug('Querying stacks for organization', { ...this.config.cloneContext, organizationUid: organization_uid });
        const stackList = this.client.stack().query({ organization_uid }).find();
        stackList
          .then((stacklist: any) => {
            log.debug('Fetched stacks', { ...this.config.cloneContext, count: stacklist.items ? stacklist.items.length : 0 });
            for (const element of stacklist.items) {
              this.stackUidList[element.name] = element.api_key;
              this.masterLocaleList[element.name] = element.master_locale;
              stackChoice.choices.push(element.name);
            }
            spinner.succeed('Fetched stack');
            return resolve(stackChoice);
          })
          .catch((error: any) => {
            spinner.fail();
            return reject(error);
          });
      } catch (e) {
        spinner.fail();
        return reject(e);
      }
    });
  }

  displayBackOptionMessage(): void {
    const ui = new inquirer.ui.BottomBar();
    ui.updateBottomBar(chalk.cyan('\nPress shift & left arrow together to undo the operation\n'));
  }

  setBackKeyPressHandler(backKeyPressHandler: (...args: any[]) => void): void {
    this.backKeyPressHandler = backKeyPressHandler;
  }

  removeBackKeyPressHandler(): void {
    if (this.backKeyPressHandler) {
      process.stdin.removeListener('keypress', this.backKeyPressHandler);
    }
  }

  setExectingCommand(command: number): void {
    // 0 for org, 1 for stack, 1 for branch, 3 stack cancelled, 4 branch cancelled
    this.executingCommand = command;
  }

  async handleStackSelection(options: { org?: any; msg?: string; isSource?: boolean } = {}): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const { org = {}, msg = '', isSource = true } = options || {};
        log.debug('Handling stack selection', { ...this.config.cloneContext, isSource, orgName: org.Organization, msg });

        const stackList = await this.getStack(org, msg, isSource).catch(reject);

        if (stackList) {
          this.displayBackOptionMessage();

          log.debug(`Found ${stackList.choices?.length || 0} stack(s) to choose from`, this.config.cloneContext);
          const selectedStack = await inquirer.prompt(stackList);
          log.debug(`Stack selected: ${selectedStack.stack}`, this.config.cloneContext);
          if (this.executingCommand != 1) {
            return reject();
          }
          if (isSource) {
            this.config.sourceStackName = selectedStack.stack;
            this.master_locale = this.masterLocaleList[selectedStack.stack];
            this.config.source_stack = this.stackUidList[selectedStack.stack];
            log.debug(`Source stack configured`, this.config.cloneContext);
          } else {
            this.config.target_stack = this.stackUidList[selectedStack.stack];
            this.config.destinationStackName = selectedStack.stack;
            log.debug(`Target stack configured`, this.config.cloneContext);
          }

          resolve(selectedStack);
        }
      } catch (error) {
        return reject(error);
      }
    });
  }

  async validateIfBranchExist(stackAPIClient: any, isSource: boolean): Promise<void> {
    let spinner: any;
    const completeSpinner = (msg: string, method: string = 'succeed') => {
      spinner[method](msg);
      spinner.stop();
    };
    try {
      const branch = isSource ? this.config.sourceStackBranch : this.config.targetStackBranch;
      log.debug('Validating branch existence', this.config.cloneContext);
      spinner = ora(`Validation if ${isSource ? 'source' : 'target'} branch exist.!`).start();
      const isBranchExist = await stackAPIClient
        .branch(branch)
        .fetch()
        .then((data: any) => data);

      if (isBranchExist && typeof isBranchExist === 'object') {
        log.debug('Branch validation successful', this.config.cloneContext);
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch verified.!`);
      } else {
        log.error('Branch not found', this.config.cloneContext);
        completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail');
        process.exit();
      }
    } catch (e) {
      completeSpinner(`${isSource ? 'Source' : 'Target'} branch not found.!`, 'fail');
      throw e;
    }
  }

  async resolveBranchAliases(isSource: boolean = false): Promise<void> {
    try {
      log.debug('Resolving branch aliases', { ...this.config.cloneContext, isSource, alias: isSource ? this.config.sourceStackBranchAlias : this.config.targetStackBranchAlias });
      if (isSource) {
        const sourceStack = this.client.stack({ api_key: this.config.source_stack });
        this.config.sourceStackBranch = await getBranchFromAlias(sourceStack, this.config.sourceStackBranchAlias);
        log.debug('Source branch alias resolved', { ...this.config.cloneContext, alias: this.config.sourceStackBranchAlias, branch: this.config.sourceStackBranch });
      } else {
        const targetStack = this.client.stack({ api_key: this.config.target_stack });
        this.config.targetStackBranch = await getBranchFromAlias(targetStack, this.config.targetStackBranchAlias);
        log.debug('Target branch alias resolved', { ...this.config.cloneContext, alias: this.config.targetStackBranchAlias, branch: this.config.targetStackBranch });
      }
    } catch (error) {
      throw error;
    }
  }

  async handleBranchSelection(options: { api_key?: string; isSource?: boolean; returnBranch?: boolean } = {}): Promise<any> {
    const { api_key, isSource = true, returnBranch = false } = options;
    return new Promise(async (resolve, reject) => {
      let spinner: any;
      try {
        log.debug('Handling branch selection', { ...this.config.cloneContext, isSource, returnBranch, stackApiKey: isSource ? this.config.source_stack : this.config.target_stack });
        const stackAPIClient = this.client.stack({
          api_key: isSource ? this.config.source_stack : this.config.target_stack,
          management_token: this.config.management_token,
        });

        // NOTE validate if source branch is exist
        if (isSource && this.config.sourceStackBranch) {
          log.debug('Validating source branch exists', { ...this.config.cloneContext, branch: this.config.sourceStackBranch });
          await this.validateIfBranchExist(stackAPIClient, true);
          return resolve(undefined);
        } else if (isSource && this.config.sourceStackBranchAlias) {
          log.debug('Resolving source branch alias', { ...this.config.cloneContext, alias: this.config.sourceStackBranchAlias });
          await this.resolveBranchAliases(true);
          return resolve(undefined);
        }

        // NOTE Validate target branch is exist
        if (!isSource && this.config.targetStackBranch) {
          log.debug('Validating target branch exists', { ...this.config.cloneContext, branch: this.config.targetStackBranch });
          await this.validateIfBranchExist(stackAPIClient, false);
          return resolve(undefined);
        } else if (!isSource && this.config.targetStackBranchAlias) {
          log.debug('Resolving target branch alias', { ...this.config.cloneContext, alias: this.config.targetStackBranchAlias });
          await this.resolveBranchAliases();
          return resolve(undefined);
        }
        spinner = ora('Fetching Branches').start();
        log.debug(`Querying branches for stack: ${isSource ? this.config.source_stack : this.config.target_stack}`, this.config.cloneContext);
        const result = await stackAPIClient
          .branch()
          .query()
          .find()
          .then(({ items }: any) => items)
          .catch((_err: any) => {});

        const condition = result && Array.isArray(result) && result.length > 0;
        log.debug(`Found ${result?.length || 0} branch(es)`, this.config.cloneContext);

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
              choices: result.map((row: any) => row.uid),
            });
            if (this.executingCommand != 2) {
              return reject();
            }
            if (isSource) {
              this.config.sourceStackBranch = branch;
              log.debug(`Source branch selected: ${branch}`, this.config.cloneContext);
            } else {
              this.config.targetStackBranch = branch;
              log.debug(`Target branch selected: ${branch}`, this.config.cloneContext);
            }
          } else {
            spinner.succeed('No branches found.!');
          }

          resolve(undefined);
        }
      } catch (e) {
        if (spinner) spinner.fail();
        return reject(e);
      }
    });
  }

  async executeStackPrompt(params: any = {}): Promise<void> {
    try {
      this.setExectingCommand(1);
      const sourceStack = await this.cloneCommand.execute(HandleStackCommand(params, this));
      if (this.config.source_stack) {
        await this.executeBranchPrompt(params);
      }
      // Update stackName default dynamically
      this.stackNamePrompt.default = this.config.stackName || `Copy of ${sourceStack.stack || this.config.source_alias || 'ABC'}`;
    } catch (error) {
      throw error;
    }
  }

  async executeBranchPrompt(parentParams: any): Promise<void> {
    try {
      this.setExectingCommand(2);
      await this.cloneCommand.execute(
        HandleBranchCommand(
          { api_key: this.config.source_stack },
          this,
          this.executeStackPrompt.bind(this, parentParams),
        ),
      );
      await this.executeExport();
    } catch (error) {
      throw error;
    }
  }

  async executeExport(): Promise<void> {
    try {
      log.debug('Executing export operation', this.config.cloneContext);
      const exportRes = await this.cloneCommand.execute(HandleExportCommand(null, this));
      await this.cloneCommand.execute(SetBranchCommand(null, this));

      if (exportRes) {
        log.debug('Export operation completed, proceeding with destination', this.config.cloneContext);
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

  async execute(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let keyPressHandler: any;
      try {
        log.debug('Starting clone execution', { ...this.config.cloneContext, sourceStack: this.config.source_stack, targetStack: this.config.target_stack });
        if (!this.config.source_stack) {
          const orgMsg = 'Choose an organization where your source stack exists:';
          log.debug('Source stack not provided, prompting for organization', this.config.cloneContext);
          this.setExectingCommand(0);
          this.removeBackKeyPressHandler();
          const org = await this.cloneCommand.execute(HandleOrgCommand({ msg: orgMsg, isSource: true }, this));
          const self = this;
          if (org) {
            keyPressHandler = async function (_ch: any, key: any) {
              // executingCommand is a tracking property to determine which method invoked this key press.
              if (key.name === 'left' && key.shift) {
                if (self.executingCommand === 1) {
                  self.setExectingCommand(3);
                } else if (self.executingCommand === 2) {
                  self.setExectingCommand(4);
                }
                self.config.source_stack = undefined;
                self.config.sourceStackBranch = undefined;
                if (self.executingCommand != 0) {
                  console.clear();
                  await self.cloneCommand.undo();
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
          log.debug('Source stack provided, proceeding with branch selection and export', this.config.cloneContext);
          this.setExectingCommand(2);
          await this.handleBranchSelection({ api_key: this.config.source_stack });
          log.debug('Starting export operation', this.config.cloneContext);
          const exportRes = await this.cloneCommand.execute(HandleExportCommand(null, this));
          await this.cloneCommand.execute(SetBranchCommand(null, this));

          if (exportRes) {
            log.debug('Export completed, proceeding with destination setup', this.config.cloneContext);
            this.executeDestination().catch((error: any) => {
              return reject(error);
            });
          }
        }
        log.debug('Clone execution completed successfully', this.config.cloneContext);
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }

  async executeDestination(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let keyPressHandler: any;
      try {
        log.debug('Executing destination setup', this.config.cloneContext);
        let canCreateStack: any = false;
        if (!this.config.target_stack) {
          log.debug('Target stack not provided, prompting for stack creation', this.config.cloneContext);
          canCreateStack = await inquirer.prompt(STACK_CREATION_CONFIRMATION);
        }

        this.setExectingCommand(0);
        this.removeBackKeyPressHandler();

        const orgMsgExistingStack = 'Choose an organization where the destination stack exists: ';
        const orgMsgNewStack = 'Choose an organization where you want to create a stack: ';

        let org: any;
        if (!this.config.target_stack) {
          org = await this.cloneCommand.execute(
            HandleOrgCommand(
              {
                msg: !canCreateStack.stackCreate ? orgMsgExistingStack : orgMsgNewStack,
                isSource: false,
              },
              this,
            ),
          );
        }

        const params = { org, canCreateStack };
        if (!this.config.target_stack) {
          const self = this;
          keyPressHandler = async function (_ch: any, key: any) {
            if (key.name === 'left' && key.shift) {
              if (self.executingCommand === 1) {
                self.setExectingCommand(3);
              } else if (self.executingCommand === 2) {
                self.setExectingCommand(4);
              }
              if (self.createNewStackPrompt) {
                (self.createNewStackPrompt as any).stop();
              }
              self.config.target_stack = undefined as any;
              self.config.targetStackBranch = undefined;
              if (self.executingCommand != 0) {
                console.clear();
                await self.cloneCommand.undo();
              }
            }
          };
          process.stdin.addListener('keypress', keyPressHandler);
          this.setBackKeyPressHandler(keyPressHandler);
          await this.executeStackDestinationPrompt(params);
        } else {
          await this.executeBranchDestinationPrompt(params);
        }

        log.debug('Destination setup completed successfully', this.config.cloneContext);
        return resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async executeStackDestinationPrompt(params: any): Promise<void> {
    try {
      this.setExectingCommand(1);
      const { org, canCreateStack } = params;
      if (!canCreateStack.stackCreate) {
        const stackMsg = 'Choose the destination stack:';
        await this.cloneCommand.execute(HandleDestinationStackCommand({ org, msg: stackMsg, isSource: false }, this));
        await this.executeBranchDestinationPrompt(params);
      } else {
        const orgUid = this.orgUidList[org.Organization];
        await this.cloneCommand.execute(CreateNewStackCommand({ orgUid }, this));
        this.removeBackKeyPressHandler();
        await this.cloneCommand.execute(CloneTypeSelectionCommand(null, this));
      }
    } catch (error) {
      throw error;
    }
  }

  async executeBranchDestinationPrompt(parentParams: any): Promise<void> {
    try {
      this.setExectingCommand(2);
      await this.cloneCommand.execute(
        HandleBranchCommand(
          { isSource: false, api_key: this.config.target_stack },
          this,
          this.executeStackDestinationPrompt.bind(this, parentParams),
        ),
      );
      this.removeBackKeyPressHandler();
      await this.cloneCommand.execute(CloneTypeSelectionCommand(null, this));
    } catch (error) {
      throw error;
    }
  }

  async cmdExport(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      log.debug('Preparing export command', { ...this.config.cloneContext, sourceStack: this.config.source_stack, cloneType: this.config.cloneType });
      // Creating export specific config by merging external configurations
      let exportConfig: any = Object.assign({}, cloneDeep(this.config), { ...this.config?.export });
      delete exportConfig.import;
      delete exportConfig.export;

      // Resolve path to package root (works in both src and lib contexts)
      const packageRoot = __dirname.includes('/src/') ? __dirname.split('/src/')[0] : __dirname.split('/lib/lib/')[0] || __dirname.split('/lib/')[0];
      const exportDir = path.join(packageRoot, 'contents');
      log.debug(`Export directory: ${exportDir}`, this.config.cloneContext);
      const cmd: string[] = ['-k', exportConfig.source_stack, '-d', exportDir];
      
      if (exportConfig.cloneType === 'a') {
        exportConfig.filteredModules = ['stack'].concat(STRUCTURE_LIST);
        log.debug(`Filtered modules for structure-only export: ${exportConfig.filteredModules.join(', ')}`, this.config.cloneContext);
      }

      if (exportConfig.source_alias) {
        cmd.push('-a', exportConfig.source_alias);
        log.debug(`Using source alias: ${exportConfig.source_alias}`, this.config.cloneContext);
      }
      if (exportConfig.sourceStackBranch) {
        cmd.push('--branch', exportConfig.sourceStackBranch);
        log.debug(`Using source branch: ${exportConfig.sourceStackBranch}`, this.config.cloneContext);
      }

      if (exportConfig.forceStopMarketplaceAppsPrompt) {
        cmd.push('-y');
        log.debug('Force stop marketplace apps prompt enabled', this.config.cloneContext);
      }

      // Resolve path to dummyConfig.json - always in src/lib/util
      const configFilePath = path.join(packageRoot, 'src', 'lib', 'util', 'dummyConfig.json');
      cmd.push('-c');
      cmd.push(configFilePath);
      log.debug(`Writing export config to: ${configFilePath}`, this.config.cloneContext);

      fs.writeFileSync(configFilePath, JSON.stringify(exportConfig));
      log.debug('Export command prepared', { 
        ...this.config.cloneContext,
        cmd: cmd.join(' '),
        exportDir,
        sourceStack: exportConfig.source_stack,
        branch: exportConfig.sourceStackBranch 
      });
      log.debug('Running export command', { ...this.config.cloneContext, cmd });
      const exportData = exportCmd.run(cmd);
      exportData.then(() => {
        log.debug('Export command completed successfully', this.config.cloneContext);
        resolve(true);
      }).catch((error: any) => {
        reject(error);
      });
    });
  }

  async cmdImport(): Promise<void> {
    return new Promise(async (resolve, _reject) => {
      log.debug('Preparing import command', { ...this.config.cloneContext, targetStack: this.config.target_stack, targetBranch: this.config.targetStackBranch });
      // Creating export specific config by merging external configurations
      let importConfig: any = Object.assign({}, cloneDeep(this.config), { ...this.config?.import });
      delete importConfig.import;
      delete importConfig.export;

      // Resolve path to dummyConfig.json - always in src/lib/util
      const importPackageRoot = __dirname.includes('/src/') ? __dirname.split('/src/')[0] : __dirname.split('/lib/lib/')[0] || __dirname.split('/lib/')[0];
      const configFilePath = path.join(importPackageRoot, 'src', 'lib', 'util', 'dummyConfig.json');
      const cmd: string[] = ['-c', configFilePath];

      if (importConfig.destination_alias) {
        cmd.push('-a', importConfig.destination_alias);
        log.debug(`Using destination alias: ${importConfig.destination_alias}`, this.config.cloneContext);
      }
      if (!importConfig.data && importConfig.sourceStackBranch && importConfig.pathDir) {
        const dataPath = path.join(importConfig.pathDir, importConfig.sourceStackBranch);
        cmd.push('-d', dataPath);
        log.debug(`Import data path: ${dataPath}`, this.config.cloneContext);
      }
      if (importConfig.targetStackBranch) {
        cmd.push('--branch', importConfig.targetStackBranch);
        log.debug(`Using target branch: ${importConfig.targetStackBranch}`, this.config.cloneContext);
      }
      if (importConfig.importWebhookStatus) {
        cmd.push('--import-webhook-status', importConfig.importWebhookStatus);
        log.debug(`Import webhook status: ${importConfig.importWebhookStatus}`, this.config.cloneContext);
      }

      if (importConfig.skipAudit) {
        cmd.push('--skip-audit');
        log.debug('Skip audit flag enabled', this.config.cloneContext);
      }

      if (importConfig.forceStopMarketplaceAppsPrompt) {
        cmd.push('-y');
        log.debug('Force stop marketplace apps prompt enabled', this.config.cloneContext);
      }

      log.debug(`Writing import config to: ${configFilePath}`, this.config.cloneContext);
      fs.writeFileSync(configFilePath, JSON.stringify(importConfig));
      log.debug('Import command prepared', { 
        ...this.config.cloneContext,
        cmd: cmd.join(' '),
        targetStack: importConfig.target_stack,
        targetBranch: importConfig.targetStackBranch,
        dataPath: importConfig.data || (importConfig.pathDir && importConfig.sourceStackBranch ? path.join(importConfig.pathDir, importConfig.sourceStackBranch) : undefined)
      });
      log.debug('Running import command', { ...this.config.cloneContext, cmd });
      const importData = importCmd.run(cmd);
      importData.then(() => {
        log.debug('Import command completed successfully', this.config.cloneContext);
        log.debug('Clearing import config file', this.config.cloneContext);
        fs.writeFileSync(configFilePath, JSON.stringify({}));
        resolve();
      }).catch((error: any) => {
        log.error('Import command failed', { ...this.config.cloneContext, error });
        throw error;
      });
    });
  }

  setCreateNewStackPrompt(createNewStackPrompt: any): void {
    this.createNewStackPrompt = createNewStackPrompt;
  }

  async setBranch(): Promise<void> {
    if (!this.config.sourceStackBranch) {
      try {
        const branches = await this.client
          .stack({ api_key: this.config.source_stack })
          .branch()
          .query()
          .find()
          .catch((_err: any) => {});

        if (branches && branches.items && branches.items.length) {
          this.config.sourceStackBranch = 'main';
        }
      } catch (_error) {
        // Ignore error
      }
    }
  }

  getNewStackPromptResult(): Promise<any> {
    return new Promise((resolve) => {
      (prompt as any).get(
        {
          properties: {
            name: { description: colors.white(this.stackNamePrompt.message), default: colors.grey(this.stackNamePrompt.default) },
          },
        },
        function (_: any, result: any) {
          if ((prompt as any).stopped) {
            (prompt as any).stopped = false;
            resolve(undefined);
          } else {
            let _name = result.name.replace(/\[\d+m/g, '');
            _name = _name.replace(//g, '');
            resolve({ stack: _name });
          }
        },
      );
    });
  }

  async createNewStack(options: { orgUid: string }): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const { orgUid } = options;
        log.debug('Creating new stack', { ...this.config.cloneContext, orgUid, masterLocale: this.master_locale, stackName: this.config.stackName });
        this.displayBackOptionMessage();
        let inputvalue: any;
        if (!this.config.stackName) {
          log.debug('Stack name not provided, prompting user', this.config.cloneContext);
          (prompt as any).start();
          (prompt as any).message = '';
          this.setCreateNewStackPrompt(prompt);
          inputvalue = await this.getNewStackPromptResult();
          this.setCreateNewStackPrompt(null);
        } else {
          inputvalue = { stack: this.config.stackName };
        }
        if (this.executingCommand === 0 || !inputvalue) {
          log.debug('Stack creation cancelled or invalid input', this.config.cloneContext);
          return reject();
        }

        let stack = { name: inputvalue.stack, master_locale: this.master_locale };
        log.debug('Creating stack with configuration', this.config.cloneContext);
        const spinner = ora('Creating New stack').start();
        log.debug('Sending stack creation API request', this.config.cloneContext);
        const newStack = this.client.stack().create({ stack }, { organization_uid: orgUid });
        newStack
          .then((result: any) => {
        log.debug('Stack created successfully', { 
          ...this.config.cloneContext,
          stackName: result.name,
        });
            spinner.succeed('New Stack created Successfully name as ' + result.name);
            this.config.target_stack = result.api_key;
            this.config.destinationStackName = result.name;
            log.debug('Target stack configuration updated', this.config.cloneContext);
            return resolve(result);
          })
          .catch((error: any) => {
            spinner.fail();
            return reject(error.errorMessage + ' Contact the Organization owner for Stack Creation access.');
          });
      } catch (error) {
        return reject(error);
      }
    });
  }

  async cloneTypeSelection(): Promise<any> {
    console.clear();
    return new Promise(async (resolve, reject) => {
      try {
        log.debug('Starting clone type selection', this.config.cloneContext);
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
        let successMsg: string;
        let selectedValue: any = {};
        // Resolve path to package root (works in both src and lib contexts)
        const cloneTypePackageRoot = __dirname.includes('/src/') ? __dirname.split('/src/')[0] : __dirname.split('/lib/lib/')[0] || __dirname.split('/lib/')[0];
        this.config.data = path.join(cloneTypePackageRoot, 'contents', this.config.sourceStackBranch || '');
        log.debug(`Clone data directory: ${this.config.data}`, this.config.cloneContext);

        if (!this.config.cloneType) {
          log.debug('Clone type not specified, prompting user for selection', this.config.cloneContext);
          selectedValue = await inquirer.prompt(cloneTypeSelection);
        } else {
          log.debug(`Using pre-configured clone type: ${this.config.cloneType}`, this.config.cloneContext);
        }

        if (this.config.cloneType === 'a' || selectedValue.type === 'Structure (all modules except entries & assets)') {
          this.config.modules = STRUCTURE_LIST;
          successMsg = 'Stack clone Structure completed';
          log.debug(`Clone type: Structure only. Modules to clone: ${STRUCTURE_LIST.join(', ')}`, this.config.cloneContext);
        } else {
          successMsg = 'Stack clone completed with structure and content';
          log.debug('Clone type: Structure with content (all modules)', this.config.cloneContext);
        }

        this.cmdImport()
          .then(() => {
            log.debug('Clone type selection and import completed successfully', this.config.cloneContext);
            resolve(successMsg);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}
