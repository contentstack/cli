import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, v2Logger } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { fsUtil } from '../../utils';
import { WorkflowConfig, ModuleClassParams } from '../../types';

export default class ExportWorkFlows extends BaseClass {
  private workflows: Record<string, Record<string, string>>;
  private workflowConfig: WorkflowConfig;
  public webhooksFolderPath: string;
  private qs: {
    include_count: boolean;
    skip?: number;
  };

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.workflows = {};
    this.workflowConfig = exportConfig.modules.workflows;
    this.qs = { include_count: true };
    this.exportConfig.context.module = 'workflows';
  }

  async start(): Promise<void> {
    this.webhooksFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.workflowConfig.dirName,
    );

    await fsUtil.makeDirectory(this.webhooksFolderPath);
    await this.getWorkflows();

    if (this.workflows === undefined || isEmpty(this.workflows)) {
      v2Logger.info(messageHandler.parse('WORKFLOW_NOT_FOUND'), this.exportConfig.context);
    } else {
      fsUtil.writeFile(pResolve(this.webhooksFolderPath, this.workflowConfig.fileName), this.workflows);
      v2Logger.success(
        messageHandler.parse('WORKFLOW_EXPORT_COMPLETE', Object.keys(this.workflows).length ),
        this.exportConfig.context,
      );
    }
  }

  async getWorkflows(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
    }

    await this.stack
      .workflow()
      .fetchAll(this.qs)
      .then(async (data: any) => {
        const { items, count } = data;
        //NOTE - Handle the case where old workflow api is enabled in that case getting responses as objects.
        const workflowCount = count !== undefined ? count : items.length;
        if (items?.length) {
          await this.sanitizeAttribs(items);
          skip += this.workflowConfig.limit || 100;
          if (skip >= workflowCount) {
            return;
          }
          return await this.getWorkflows(skip);
        }
      })
      .catch((error: any) => {
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  async sanitizeAttribs(workflows: Record<string, string>[]) {
    for (let index = 0; index < workflows?.length; index++) {
      await this.getWorkflowRoles(workflows[index]);
      const workflowUid = workflows[index].uid;
      const workflowName = workflows[index]?.name || '';
      this.workflows[workflowUid] = omit(workflows[index], this.workflowConfig.invalidKeys);
      v2Logger.success(
        messageHandler.parse('WORKFLOW_EXPORT_SUCCESS', workflowName),
        this.exportConfig.context,
      );
    }
  }

  async getWorkflowRoles(workflow: Record<string, any>) {
    for (const stage of workflow?.workflow_stages) {
      for (let i = 0; i < stage?.SYS_ACL?.roles?.uids?.length; i++) {
        const roleUid = stage.SYS_ACL.roles.uids[i];
        const roleData = await this.getRoles(roleUid);
        stage.SYS_ACL.roles.uids[i] = roleData;
      }
    }
  }

  async getRoles(roleUid: number): Promise<any> {
    return await this.stack
      .role(roleUid)
      .fetch({ include_rules: true, include_permissions: true })
      .then((data: any) => data)
      .catch((err: any) =>
        handleAndLogError(
          err,
          { ...this.exportConfig.context }
        ),
      );
  }
}
