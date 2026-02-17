import chalk from 'chalk';
import map from 'lodash/map';
import find from 'lodash/find';
import { join } from 'node:path';
import values from 'lodash/values';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import findIndex from 'lodash/findIndex';

import BaseClass, { ApiOptions } from './base-class';
import { fsUtil, fileHelper } from '../../utils';
import { log, handleAndLogError } from '@contentstack/cli-utilities';
import { ModuleClassParams, WorkflowConfig } from '../../types';

export default class ImportWorkflows extends BaseClass {
  private mapperDirPath: string;
  private workflowsFolderPath: string;
  private workflowUidMapperPath: string;
  private createdWorkflowsPath: string;
  private failedWorkflowsPath: string;
  private workflowsConfig: WorkflowConfig;
  private workflows: Record<string, any>;
  private workflowUidMapper: Record<string, unknown>;
  private createdWorkflows: Record<string, unknown>[];
  private failedWebhooks: Record<string, unknown>[];
  private roleNameMap: Record<string, unknown>;

  constructor({ importConfig, stackAPIClient }: ModuleClassParams) {
    super({ importConfig, stackAPIClient });
    this.importConfig.context.module = 'workflows';
    this.workflowsConfig = importConfig.modules.workflows;
    this.mapperDirPath = join(this.importConfig.backupDir, 'mapper', 'workflows');
    this.workflowsFolderPath = join(this.importConfig.backupDir, this.workflowsConfig.dirName);
    this.workflowUidMapperPath = join(this.mapperDirPath, 'uid-mapping.json');
    this.createdWorkflowsPath = join(this.mapperDirPath, 'success.json');
    this.failedWorkflowsPath = join(this.mapperDirPath, 'fails.json');
    this.workflows = {};
    this.failedWebhooks = [];
    this.createdWorkflows = [];
    this.workflowUidMapper = {};
    this.roleNameMap = {};
  }

  /**
   * @method start
   * @returns {Promise<void>} Promise<void>
   */
  async start(): Promise<void> {
    log.debug('Checking for workflows folder existence', this.importConfig.context);

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.workflowsFolderPath)) {
      log.debug(`Found workflows folder: ${this.workflowsFolderPath}`, this.importConfig.context);
      this.workflows = fsUtil.readFile(join(this.workflowsFolderPath, this.workflowsConfig.fileName), true) as Record<
        string,
        unknown
      >;
      const workflowCount = Object.keys(this.workflows || {}).length;
      log.debug(`Loaded ${workflowCount} workflow items from file`, this.importConfig.context);
    } else {
      log.info(`No Workflows Found - '${this.workflowsFolderPath}'`, this.importConfig.context);
      return;
    }

    //create workflows in mapper directory
    log.debug('Creating workflows mapper directory', this.importConfig.context);
    await fsUtil.makeDirectory(this.mapperDirPath);
    log.debug('Loading existing workflow UID mappings', this.importConfig.context);
    this.workflowUidMapper = fileHelper.fileExistsSync(this.workflowUidMapperPath)
      ? (fsUtil.readFile(join(this.workflowUidMapperPath), true) as Record<string, unknown>)
      : {};

    if (Object.keys(this.workflowUidMapper)?.length > 0) {
      const workflowUidCount = Object.keys(this.workflowUidMapper || {}).length;
      log.debug(`Loaded existing workflow UID data: ${workflowUidCount} items`, this.importConfig.context);
    } else {
      log.debug('No existing workflow UID mappings found', this.importConfig.context);
    }

    if (this.workflows === undefined || isEmpty(this.workflows)) {
      log.info('No Workflow Found', this.importConfig.context);
      return;
    }

    //fetch all roles
    log.debug('Fetching all roles for workflow processing', this.importConfig.context);
    await this.getRoles();
    log.debug('Starting workflow import process', this.importConfig.context);
    await this.importWorkflows();

    log.debug('Processing workflow import results', this.importConfig.context);
    if (this.createdWorkflows?.length) {
      fsUtil.writeFile(this.createdWorkflowsPath, this.createdWorkflows);
      log.debug(`Written ${this.createdWorkflows.length} successful workflows to file`, this.importConfig.context);
    }

    if (this.failedWebhooks?.length) {
      fsUtil.writeFile(this.failedWorkflowsPath, this.failedWebhooks);
      log.debug(`Written ${this.failedWebhooks.length} failed workflows to file`, this.importConfig.context);
    }

    log.success('Workflows have been imported successfully!', this.importConfig.context);
  }

  async getRoles(): Promise<void> {
    log.debug('Fetching roles from stack', this.importConfig.context);
    const roles = await this.stack
      .role()
      .fetchAll()
      .then((data: any) => {
        log.debug(`Successfully fetched ${data?.items?.length || 0} roles`, this.importConfig.context);
        return data;
      })
      .catch((err: any) => {
        log.debug('Error fetching roles', this.importConfig.context);
        handleAndLogError(err, { ...this.importConfig.context });
      });

    for (const role of roles?.items || []) {
      this.roleNameMap[role.name] = role.uid;
      log.debug(`Role mapping: ${role.name} → ${role.uid}`, this.importConfig.context);
    }

    const roleCount = Object.keys(this.roleNameMap || {}).length;
    log.debug(`Created role name data for ${roleCount} roles`, this.importConfig.context);
  }

  async importWorkflows() {
    log.debug('Validating workflows data', this.importConfig.context);
    const apiContent = values(this.workflows);
    const oldWorkflows = cloneDeep(values(this.workflows));

    log.debug(`Starting to import ${apiContent.length} workflows`, this.importConfig.context);

    //check and create custom roles if not exists
    log.debug('Checking and creating custom roles if needed', this.importConfig.context);
    for (const workflow of values(this.workflows)) {
      if (!this.workflowUidMapper.hasOwnProperty(workflow.uid)) {
        log.debug(`Processing custom roles for workflow: ${workflow.name}`, this.importConfig.context);
        await this.createCustomRoleIfNotExists(workflow);
      } else {
        log.debug(`Workflow ${workflow.name} already exists, skipping custom role creation`, this.importConfig.context);
      }
    }

    const onSuccess = async ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      log.debug(
        `Workflow '${name}' imported successfully, processing next available stages`,
        this.importConfig.context,
      );
      const oldWorkflowStages = find(oldWorkflows, { uid })?.workflow_stages;
      if (!isEmpty(filter(oldWorkflowStages, ({ next_available_stages }) => !isEmpty(next_available_stages)))) {
        log.debug(`Updating next available stages for workflow '${name}'`, this.importConfig.context);
        let updateRresponse = await this.updateNextAvailableStagesUid(
          response,
          response.workflow_stages,
          oldWorkflowStages,
        ).catch((error) => {
          handleAndLogError(error, { ...this.importConfig.context, name }, `Workflow '${name}' update failed`);
        });

        if (updateRresponse) {
          response = updateRresponse;
          log.debug(`Successfully updated next available stages for workflow '${name}'`, this.importConfig.context);
        }
      }

      this.createdWorkflows.push(response);
      this.workflowUidMapper[uid] = response.uid;
      log.success(`Workflow '${name}' imported successfully`, this.importConfig.context);
      log.debug(`Workflow UID mapping: ${uid} → ${response.uid}`, this.importConfig.context);
      fsUtil.writeFile(this.workflowUidMapperPath, this.workflowUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name, uid } = apiData;
      log.debug(`Workflow '${name}' (${uid}) failed to import`, this.importConfig.context);
      const workflowExists = err?.errors?.name || err?.errors?.['workflow.name'];
      if (workflowExists) {
        log.info(`Workflow '${name}' already exists`, this.importConfig.context);
      } else {
        this.failedWebhooks.push(apiData);
        if (error.errors?.['workflow_stages.0.users']) {
          log.error(
            "Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack.",
            this.importConfig.context,
          );
        } else {
          handleAndLogError(error, { ...this.importConfig.context, name }, `Workflow '${name}' failed to be import`);
        }
      }
    };

    log.debug(`Using concurrency limit: ${this.importConfig.fetchConcurrency || 1}`, this.importConfig.context);
    await this.makeConcurrentCall(
      {
        apiContent,
        processName: 'create workflows',
        apiParams: {
          serializeData: this.serializeWorkflows.bind(this),
          reject: onReject,
          resolve: onSuccess,
          entity: 'create-workflows',
          includeParamOnCompletion: true,
        },
        concurrencyLimit: this.importConfig.fetchConcurrency || 1,
      },
      undefined,
      false,
    );

    log.debug('Workflows import process completed', this.importConfig.context);
  }

  updateNextAvailableStagesUid(
    workflow: Record<string, any>,
    newWorkflowStages: Record<string, any>[],
    oldWorkflowStages: Record<string, any>[],
  ): Promise<any> {
    newWorkflowStages = map(newWorkflowStages, (newStage, index) => {
      const oldStage = oldWorkflowStages[index];
      if (!isEmpty(oldStage.next_available_stages)) {
        newStage.next_available_stages = map(oldStage.next_available_stages, (stageUid) => {
          if (stageUid === '$all') return stageUid;
          const stageName = find(oldWorkflowStages, { uid: stageUid })?.name;
          return find(newWorkflowStages, { name: stageName })?.uid;
        }).filter((val) => val);
      }

      return newStage;
    });

    const updateWorkflow = this.stack.workflow(workflow.uid);
    Object.assign(updateWorkflow, {
      name: workflow.name,
      branches: workflow.branches,
      workflow_stages: newWorkflowStages,
      content_types: workflow.content_types,
    });

    return updateWorkflow.update();
  }

  /**
   * @method serializeWorkflows
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeWorkflows(apiOptions: ApiOptions): ApiOptions {
    let { apiData: workflow } = apiOptions;

    if (this.workflowUidMapper.hasOwnProperty(workflow.uid)) {
      log.info(
        `Workflow '${workflow.name}' already exists. Skipping it to avoid duplicates!`,
        this.importConfig.context,
      );
      apiOptions.entity = undefined;
    } else {
      if (workflow.admin_users !== undefined) {
        log.info(
          chalk.yellow('We are skipping import of `Workflow superuser(s)` from workflow'),
          this.importConfig.context,
        );
        delete workflow.admin_users;
      }
      // One branch is required to create workflow.
      if (!workflow.branches) {
        workflow.branches = ['main'];
      }
      for (const stage of workflow.workflow_stages) {
        delete stage.uid;

        if (!isEmpty(stage.next_available_stages)) {
          stage.next_available_stages = ['$all'];
        }
      }

      apiOptions.apiData = workflow;
    }
    return apiOptions;
  }

  async createCustomRoleIfNotExists(workflow: Record<string, any>) {
    const onSuccess = ({ response, apiData, additionalInfo: { workflowUid, stageIndex } }: any) => {
      const { name } = apiData;
      this.updateRoleData({ workflowUid, stageIndex, roleData: apiData });
      this.roleNameMap[name] = response?.uid;
    };

    const onReject = ({ error, apiData: { name } = { name: '' } }: any) => {
      handleAndLogError(error, { ...this.importConfig.context, name }, `Failed to create custom roles '${name}'`);
    };

    const workflowStages = workflow.workflow_stages;
    let stageIndex = 0;
    for (const stage of workflowStages) {
      if (stage?.SYS_ACL?.users?.uids?.length && stage?.SYS_ACL?.users?.uids[0] !== '$all') {
        stage.SYS_ACL.users.uids = ['$all'];
      }
      if (stage?.SYS_ACL?.roles?.uids?.length) {
        const apiContent = stage.SYS_ACL.roles.uids;
        await this.makeConcurrentCall(
          {
            apiContent,
            processName: 'create custom role',
            apiParams: {
              serializeData: this.serializeCustomRoles.bind(this),
              reject: onReject,
              resolve: onSuccess,
              entity: 'create-custom-role',
              includeParamOnCompletion: true,
              additionalInfo: { workflowUid: workflow.uid, stageIndex },
            },
            concurrencyLimit: this.importConfig.fetchConcurrency || 1,
          },
          undefined,
          false,
        );
      }
      stageIndex++;
    }
  }

  /**
   * @method serializeCustomRoles
   * @param {ApiOptions} apiOptions ApiOptions
   * @returns {ApiOptions} ApiOptions
   */
  serializeCustomRoles(apiOptions: ApiOptions): ApiOptions {
    let {
      apiData: roleData,
      additionalInfo: { workflowUid, stageIndex },
    } = apiOptions;
    if (!this.roleNameMap[roleData.name]) {
      // rules.branch is required to create custom roles.
      const branchRuleExists = find(roleData.rules, (rule: any) => rule.module === 'branch');
      if (!branchRuleExists) {
        roleData.rules.push({
          module: 'branch',
          branches: ['main'],
          acl: { read: true },
        });
      }
      apiOptions = roleData;
    } else {
      apiOptions.entity = undefined;
      this.updateRoleData({ workflowUid, stageIndex, roleData });
    }
    return apiOptions;
  }

  updateRoleData(params: { workflowUid: string; stageIndex: number; roleData: any }) {
    const { workflowUid, stageIndex, roleData } = params;
    const workflowStage = this.workflows[workflowUid].workflow_stages;
    const roles = workflowStage[stageIndex].SYS_ACL.roles.uids;
    const index = findIndex(roles, ['uid', roleData.uid]);
    roles[index >= 0 ? index : roles.length] = this.roleNameMap[roleData.name];
  }
}
