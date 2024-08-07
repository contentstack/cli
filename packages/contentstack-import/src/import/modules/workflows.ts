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
import { log, formatError, fsUtil, fileHelper } from '../../utils';
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
    log(this.importConfig, 'Migrating workflows', 'info');

    //Step1 check folder exists or not
    if (fileHelper.fileExistsSync(this.workflowsFolderPath)) {
      this.workflows = fsUtil.readFile(join(this.workflowsFolderPath, this.workflowsConfig.fileName), true) as Record<
        string,
        unknown
      >;
    } else {
      log(this.importConfig, `No Workflows Found - '${this.workflowsFolderPath}'`, 'info');
      return;
    }

    //create workflows in mapper directory
    await fsUtil.makeDirectory(this.mapperDirPath);
    this.workflowUidMapper = fileHelper.fileExistsSync(this.workflowUidMapperPath)
      ? (fsUtil.readFile(join(this.workflowUidMapperPath), true) as Record<string, unknown>)
      : {};

    if (this.workflows === undefined || isEmpty(this.workflows)) {
      log(this.importConfig, 'No Workflow Found', 'info');
      return;
    }

    //fetch all roles
    await this.getRoles();
    await this.importWorkflows();

    if (this.createdWorkflows?.length) {
      fsUtil.writeFile(this.createdWorkflowsPath, this.createdWorkflows);
    }

    if (this.failedWebhooks?.length) {
      fsUtil.writeFile(this.failedWorkflowsPath, this.failedWebhooks);
    }

    log(this.importConfig, 'Workflows have been imported successfully!', 'success');
  }

  async getRoles(): Promise<void> {
    const roles = await this.stack
      .role()
      .fetchAll()
      .then((data: any) => data)
      .catch((err: any) => log(this.importConfig, `Failed to fetch roles. ${formatError(err)}`, 'error'));

    for (const role of roles?.items || []) {
      this.roleNameMap[role.name] = role.uid;
    }
  }

  async importWorkflows() {
    const apiContent = values(this.workflows);
    const oldWorkflows = cloneDeep(values(this.workflows));

    //check and create custom roles if not exists
    for (const workflow of values(this.workflows)) {
      if (!this.workflowUidMapper.hasOwnProperty(workflow.uid)) {
        await this.createCustomRoleIfNotExists(workflow);
      }
    }

    const onSuccess = async ({ response, apiData: { uid, name } = { uid: null, name: '' } }: any) => {
      const oldWorkflowStages = find(oldWorkflows, { uid })?.workflow_stages;
      if (!isEmpty(filter(oldWorkflowStages, ({ next_available_stages }) => !isEmpty(next_available_stages)))) {
        let updateRresponse = await this.updateNextAvailableStagesUid(
          response,
          response.workflow_stages,
          oldWorkflowStages,
        ).catch((error) => {
          log(this.importConfig, `Workflow '${name}' update failed.`, 'error');
          log(this.importConfig, error, 'error');
        });

        if (updateRresponse) response = updateRresponse;
      }

      this.createdWorkflows.push(response);
      this.workflowUidMapper[uid] = response.uid;
      log(this.importConfig, `Workflow '${name}' imported successfully`, 'success');
      fsUtil.writeFile(this.workflowUidMapperPath, this.workflowUidMapper);
    };

    const onReject = ({ error, apiData }: any) => {
      const err = error?.message ? JSON.parse(error.message) : error;
      const { name } = apiData;
      const workflowExists = err?.errors?.name || err?.errors?.['workflow.name'];
      if (workflowExists) {
        log(this.importConfig, `Workflow '${name}' already exists`, 'info');
      } else {
        this.failedWebhooks.push(apiData);
        if (error.errors['workflow_stages.0.users']) {
          log(
            this.importConfig,
            "Failed to import Workflows as you've specified certain roles in the Stage transition and access rules section. We currently don't import roles to the stack.",
            'error',
          );
        } else {
          log(this.importConfig, `Workflow '${name}' failed to be import. ${formatError(error)}`, 'error');
        }
      }
    };

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
  }

  updateNextAvailableStagesUid(
    workflow: Record<string, any>,
    newWorkflowStages: Record<string, any>[],
    oldWorkflowStages: Record<string, any>[],
  ) {
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
      content_types: workflow.content_types
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
      log(this.importConfig, `Workflow '${workflow.name}' already exists. Skipping it to avoid duplicates!`, 'info');
      apiOptions.entity = undefined;
    } else {
      if (workflow.admin_users !== undefined) {
        log(this.importConfig, chalk.yellow('We are skipping import of `Workflow superuser(s)` from workflow'), 'info');
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
      log(this.importConfig, `Failed to create custom roles '${name}'.${formatError(error)}`, 'error');
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
