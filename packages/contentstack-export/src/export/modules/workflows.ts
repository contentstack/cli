import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import { resolve as pResolve } from 'node:path';
import { handleAndLogError, messageHandler, log } from '@contentstack/cli-utilities';

import BaseClass from './base-class';
import { WorkflowConfig, ModuleClassParams } from '../../types';
import { fsUtil, MODULE_CONTEXTS, MODULE_NAMES } from '../../utils';

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
    this.exportConfig.context.module = MODULE_CONTEXTS.WORKFLOWS;
    this.currentModuleName = MODULE_NAMES[MODULE_CONTEXTS.WORKFLOWS];
  }

  async start(): Promise<void> {
    try {
      log.debug('Starting workflows export process...', this.exportConfig.context);

      // Setup with loading spinner
      const [totalCount] = await this.withLoadingSpinner('WORKFLOWS: Analyzing workflows...', async () => {
        this.webhooksFolderPath = pResolve(
          this.exportConfig.data,
          this.exportConfig.branchName || '',
          this.workflowConfig.dirName,
        );

        await fsUtil.makeDirectory(this.webhooksFolderPath);

        // Get count for progress tracking
        const countResponse = await this.stack.workflow().fetchAll({ ...this.qs, limit: 1 });
        const workflowCount =
          countResponse.count !== undefined ? countResponse.count : countResponse.items?.length || 0;
        return [workflowCount];
      });

      if (totalCount === 0) {
        log.info(messageHandler.parse('WORKFLOW_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Create nested progress manager for complex workflow processing
      const progress = this.createSimpleProgress(this.currentModuleName, totalCount);

      // Fetch workflows
      progress.updateStatus('Fetching workflow definitions...');
      await this.getWorkflows();

      log.debug(`Retrieved ${Object.keys(this.workflows).length} workflows`, this.exportConfig.context);

      if (this.workflows === undefined || isEmpty(this.workflows)) {
        log.info(messageHandler.parse('WORKFLOW_NOT_FOUND'), this.exportConfig.context);
      } else {
        const workflowsFilePath = pResolve(this.webhooksFolderPath, this.workflowConfig.fileName);
        log.debug(`Writing workflows to: ${workflowsFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(workflowsFilePath, this.workflows);
        log.success(
          messageHandler.parse('WORKFLOW_EXPORT_COMPLETE', Object.keys(this.workflows).length),
          this.exportConfig.context,
        );
      }

      this.completeProgress(true);
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
      this.completeProgress(false, error?.message || 'Workflows export failed');
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

      try {
        await this.getWorkflowRoles(workflows[index]);
        this.workflows[workflowUid] = omit(workflows[index], this.workflowConfig.invalidKeys);
        log.success(messageHandler.parse('WORKFLOW_EXPORT_SUCCESS', workflowName), this.exportConfig.context);

        // Track progress for each workflow
        this.progressManager?.tick(true, `workflow: ${workflowName}`);
      } catch (error) {
        log.error(`Failed to process workflow: ${workflowName}`, this.exportConfig.context);
        this.progressManager?.tick(false, `workflow: ${workflowName}`, error?.message || 'Processing failed', 'Fetch');
      }
    }

    log.debug(
      `Sanitization complete. Total workflows processed: ${Object.keys(this.workflows).length}`,
      this.exportConfig.context,
    );
  }

  async getWorkflowRoles(workflow: Record<string, any>) {
    log.debug(`Processing workflow roles for workflow: ${workflow.uid}`, this.exportConfig.context);

    for (const stage of workflow?.workflow_stages) {
      log.debug(`Processing workflow stage: ${stage.name}`, this.exportConfig.context);

      for (let i = 0; i < stage?.SYS_ACL?.roles?.uids?.length; i++) {
        const roleUid = stage.SYS_ACL.roles.uids[i];
        log.debug(`Fetching role data for role UID: ${roleUid}`, this.exportConfig.context);

        try {
          const roleData = await this.getRoles(roleUid);
          stage.SYS_ACL.roles.uids[i] = roleData;
        } catch (error) {
          log.error(`Failed to fetch role ${roleUid}`, this.exportConfig.context);
        }
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
        handleAndLogError(err, { ...this.exportConfig.context });
        throw err;
      });
  }
}
