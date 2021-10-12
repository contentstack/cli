import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';

export default class WorkflowsExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private workflowsConfig: any;
  private workflowsPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.workflowsConfig = exportConfig.moduleLevelConfig.workflows;
    this.workflowsPath = path.resolve(exportConfig.branchDir || exportConfig.exportDir, this.workflowsConfig.dirName);
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.workflowsPath);
      const workflows = await this.getWorkflows();
      await fileHelper.writeFile(path.join(this.workflowsPath, this.workflowsConfig.fileName), workflows);
      console.log('completed workflows export');
    } catch (error) {
      logger.error('error in workflows export', error);
    }
  }

  async getWorkflows() {
    let workflows = await this.stackAPIClient.workflow().fetchAll();
    if (Array.isArray(workflows.items) && workflows.items.length > 0) {
      let updatedWorkflows = this.sanitizeAttribs(workflows.items);
      return updatedWorkflows;
    }
    logger.info('No workflows found');
  }

  sanitizeAttribs(workflows) {
    let updatedWorkflows = {};
    workflows.forEach((workflow) => {
      for (let key in workflow) {
        if (this.workflowsConfig.invalidKeys.indexOf(key) !== -1) {
          delete workflow[key];
        }
      }
      updatedWorkflows[workflow.uid] = workflow;
    });
    return updatedWorkflows;
  }
}
