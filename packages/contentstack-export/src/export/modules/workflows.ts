import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

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
    log.debug(`Workflows folder path: ${this.webhooksFolderPath}`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.webhooksFolderPath);
    log.debug('Created workflows directory', this.exportConfig.context);
    
    await this.getWorkflows();
    log.debug(`Retrieved ${Object.keys(this.workflows).length} workflows`, this.exportConfig.context);

    if (this.workflows === undefined || isEmpty(this.workflows)) {
      log.info(messageHandler.parse('WORKFLOW_NOT_FOUND'), this.exportConfig.context);
    } else {
      const workflowsFilePath = pResolve(this.webhooksFolderPath, this.workflowConfig.fileName);
      log.debug(`Writing workflows to: ${workflowsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(workflowsFilePath, this.workflows);
      log.success(
        messageHandler.parse('WORKFLOW_EXPORT_COMPLETE', Object.keys(this.workflows).length ),
        this.exportConfig.context,
      );
    }
  }

  async getWorkflows(skip = 0): Promise<void> {
    if (skip) {
      this.qs.skip = skip;
      log.debug(`Fetching workflows with skip: ${skip}`, this.exportConfig.context);
    }
    log.debug(`Query parameters: ${JSON.stringify(this.qs)}`, this.exportConfig.context);

    await this.stack
      .workflow()
      .fetchAll(this.qs)
      .then(async (data: any) => {
        const { items, count } = data;
        //NOTE - Handle the case where old workflow api is enabled in that case getting responses as objects.
        const workflowCount = count !== undefined ? count : items.length;
        log.debug(`Fetched ${items?.length || 0} workflows out of total ${workflowCount}`, this.exportConfig.context);
        
        if (items?.length) {
          log.debug(`Processing ${items.length} workflows`, this.exportConfig.context);
          await this.sanitizeAttribs(items);
          skip += this.workflowConfig.limit || 100;
          if (skip >= workflowCount) {
            log.debug('Completed fetching all workflows', this.exportConfig.context);
            return;
          }
          log.debug(`Continuing to fetch workflows with skip: ${skip}`, this.exportConfig.context);
          return await this.getWorkflows(skip);
        } else {
          log.debug('No workflows found to process', this.exportConfig.context);
        }
      })
      .catch((error: any) => {
        log.debug('Error occurred while fetching workflows', this.exportConfig.context);
        handleAndLogError(error, { ...this.exportConfig.context });
      });
  }

  async sanitizeAttribs(workflows: Record<string, string>[]) {
    log.debug(`Sanitizing ${workflows.length} workflows`, this.exportConfig.context);
    
    for (let index = 0; index < workflows?.length; index++) {
      const workflowUid = workflows[index].uid;
      const workflowName = workflows[index]?.name || '';
      log.debug(`Processing workflow: ${workflowName} (${workflowUid})`, this.exportConfig.context);
      
      await this.getWorkflowRoles(workflows[index]);
      this.workflows[workflowUid] = omit(workflows[index], this.workflowConfig.invalidKeys);
      log.success(
        messageHandler.parse('WORKFLOW_EXPORT_SUCCESS', workflowName),
        this.exportConfig.context,
      );
    }
    
    log.debug(`Sanitization complete. Total workflows processed: ${Object.keys(this.workflows).length}`, this.exportConfig.context);
  }

  async getWorkflowRoles(workflow: Record<string, any>) {
    log.debug(`Processing workflow roles for workflow: ${workflow.uid}`, this.exportConfig.context);
    
    for (const stage of workflow?.workflow_stages) {
      log.debug(`Processing workflow stage: ${stage.name}`, this.exportConfig.context);
      
      for (let i = 0; i < stage?.SYS_ACL?.roles?.uids?.length; i++) {
        const roleUid = stage.SYS_ACL.roles.uids[i];
        log.debug(`Fetching role data for role UID: ${roleUid}`, this.exportConfig.context);
        const roleData = await this.getRoles(roleUid);
        stage.SYS_ACL.roles.uids[i] = roleData;
      }
    }
  }

  async getRoles(roleUid: number): Promise<any> {
    log.debug(`Fetching role with UID: ${roleUid}`, this.exportConfig.context);
    
    return await this.stack
      .role(roleUid)
      .fetch({ include_rules: true, include_permissions: true })
      .then((data: any) => {
        log.debug(`Successfully fetched role data for UID: ${roleUid}`, this.exportConfig.context);
        return data;
      })
      .catch((err: any) => {
        log.debug(`Failed to fetch role data for UID: ${roleUid}`, this.exportConfig.context);
        handleAndLogError(
          err,
          { ...this.exportConfig.context }
        );
      });
  }
}
