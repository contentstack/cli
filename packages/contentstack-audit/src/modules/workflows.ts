import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';
import { cliux, sanitizePath, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';
import BaseClass from './base-class';

export default class Workflows extends BaseClass {
  protected fix: boolean;
  public fileName: any;
  public folderPath: string;
  public workflowSchema: Workflow[];
  public ctSchema: ContentTypeStruct[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public ctUidSet: Set<string>;
  public missingCtInWorkflows: Workflow[];
  public missingCts: Set<string>;
  public workflowPath: string;
  public isBranchFixDone: boolean;

  constructor({
    fix,
    config,
    moduleName,
    ctSchema,
  }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    super({ config });
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.workflowSchema = [];
    
    log.debug(`Initializing Workflows module`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Content types count: ${ctSchema.length}`, this.config.auditContext);
    log.debug(`Module name: ${moduleName}`, this.config.auditContext);
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    log.debug(`File name: ${this.fileName}`, this.config.auditContext);
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    log.debug(`Folder path: ${this.folderPath}`, this.config.auditContext);
    
    this.ctUidSet = new Set(['$all']);
    this.missingCtInWorkflows = [];
    this.missingCts = new Set();
    this.workflowPath = '';
    this.isBranchFixDone = false;
    
    log.debug(`Workflows module initialization completed`, this.config.auditContext);
  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`, this.config.auditContext);
    log.debug(`Available modules: ${Object.keys(moduleConfig).join(', ')}`, this.config.auditContext);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} is valid`, this.config.auditContext);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found, defaulting to 'workflows'`, this.config.auditContext);
    return 'workflows';
  }

  /**
   * Check whether the given path for the workflow exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the workflow name, uid and content_types that are missing
   */
  async run(totalCount?: number) {
    try {
      if (!existsSync(this.folderPath)) {
        log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
        log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
        cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
        return {};
      }

      this.workflowPath = join(this.folderPath, this.fileName);
      log.debug(`Workflows file path: ${this.workflowPath}`, this.config.auditContext);

      // Load workflows schema with loading spinner
      await this.withLoadingSpinner('WORKFLOWS: Loading workflows schema...', async () => {
        this.workflowSchema = existsSync(this.workflowPath)
          ? values(JSON.parse(readFileSync(this.workflowPath, 'utf8')) as Workflow[])
          : [];
      });
      log.debug(`Loaded ${this.workflowSchema.length} workflows`, this.config.auditContext);

      log.debug(`Building content type UID set from ${this.ctSchema.length} content types`, this.config.auditContext);
      this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
      log.debug(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`, this.config.auditContext);

      // Create progress manager if we have a total count
      if (totalCount && totalCount > 0) {
        const progress = this.createSimpleProgress(this.moduleName, totalCount);
        progress.updateStatus('Validating workflows...');
      }

      log.debug(`Processing ${this.workflowSchema.length} workflows`, this.config.auditContext);
      for (const workflow of this.workflowSchema) {
      const { name, uid } = workflow;
      log.debug(`Processing workflow: ${name} (${uid})`, this.config.auditContext);
      log.debug(`Workflow content types: ${workflow.content_types?.join(', ') || 'none'}`, this.config.auditContext);
      log.debug(`Workflow branches: ${workflow.branches?.join(', ') || 'none'}`, this.config.auditContext);
      
      const ctNotPresent = workflow.content_types.filter((ct) => !this.ctUidSet.has(ct));
      log.debug(`Missing content types in workflow: ${ctNotPresent?.join(', ') || 'none'}`, this.config.auditContext);
      log.debug(`Config branch : ${this.config.branch}`, this.config.auditContext);

      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        branchesToBeRemoved = workflow?.branches?.filter((branch) => branch !== this.config?.branch) || [];
        log.debug(`Branches to be removed: ${branchesToBeRemoved?.join(', ') || 'none'}`, this.config.auditContext);
      } else {
        log.debug(`No branch configuration found`, this.config.auditContext);
      }

      if (ctNotPresent.length || branchesToBeRemoved?.length) {
        log.debug(`Workflow ${name} has issues - missing content types: ${ctNotPresent.length}, branches to remove: ${branchesToBeRemoved.length}`, this.config.auditContext);
        
        const tempwf = cloneDeep(workflow);
        tempwf.content_types = ctNotPresent || [];

        if (workflow?.branches && this.config?.branch) {
          tempwf.branches = branchesToBeRemoved;
        }

        if (branchesToBeRemoved?.length) {
          log.debug(`Branch fix will be needed`, this.config.auditContext);
          this.isBranchFixDone = true;
        }

        ctNotPresent.forEach((ct) => {
          log.debug(`Adding missing content type: ${ct} to the Audit report.`, this.config.auditContext);
          this.missingCts.add(ct);
        });
        this.missingCtInWorkflows.push(tempwf);
      } else {
        log.debug(`Workflow ${name} has no issues`, this.config.auditContext);
      }

      log.info(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          uid: workflow.uid,
        }),
        this.config.auditContext
      );
    }

      log.debug(`Workflows audit completed. Found ${this.missingCtInWorkflows.length} workflows with issues`, this.config.auditContext);
      log.debug(`Total missing content types: ${this.missingCts.size}`, this.config.auditContext);
      log.debug(`Branch fix needed: ${this.isBranchFixDone}`, this.config.auditContext);

      if (this.fix && (this.missingCtInWorkflows.length || this.isBranchFixDone)) {
        log.debug(`Fix mode enabled, fixing ${this.missingCtInWorkflows.length} workflows`, this.config.auditContext);
        await this.fixWorkflowSchema();
        this.missingCtInWorkflows.forEach((wf) => {
          log.debug(`Marking workflow ${wf.name} as fixed`, this.config.auditContext);
          wf.fixStatus = 'Fixed';
        });
        log.debug(`Workflows fix completed`, this.config.auditContext);
        this.completeProgress(true);
        return this.missingCtInWorkflows;
      }
      
      log.debug(`Workflows audit completed without fixes`, this.config.auditContext);
      this.completeProgress(true);
      return this.missingCtInWorkflows;
    } catch (error: any) {
      this.completeProgress(false, error?.message || 'Workflows audit failed');
      throw error;
    }
  }

  async fixWorkflowSchema() {
    log.debug(`Starting workflow schema fix`, this.config.auditContext);
    
    const newWorkflowSchema: Record<string, Workflow> = existsSync(this.workflowPath)
      ? JSON.parse(readFileSync(this.workflowPath, 'utf8'))
      : {};
    
    log.debug(`Loaded ${Object.keys(newWorkflowSchema).length} workflows for fixing`, this.config.auditContext);

    if (Object.keys(newWorkflowSchema).length !== 0) {
      log.debug(`Processing ${this.workflowSchema.length} workflows for fixes`, this.config.auditContext);
      
      for (const workflow of this.workflowSchema) {
        const { name, uid } = workflow;
        log.debug(`Fixing workflow: ${name} (${uid})`, this.config.auditContext);
        
        const fixedCts = workflow.content_types.filter((ct) => !this.missingCts.has(ct));
        log.debug(`Fixed content types: ${fixedCts.join(', ') || 'none'}`, this.config.auditContext);
        
        const fixedBranches: string[] = [];

        if (this.config.branch) {
          log.debug(`Config branch : ${this.config.branch}`, this.config.auditContext);
          log.debug(`Processing branches for workflow ${name}`, this.config.auditContext);
          workflow?.branches?.forEach((branch) => {
            if (branch !== this.config?.branch) {
              log.debug(`Removing branch: ${branch} from workflow ${name}`, this.config.auditContext);
              cliux.print($t(commonMsg.WF_BRANCH_REMOVAL, { uid, name, branch }), { color: 'yellow' });
            } else {
              log.debug(`Keeping branch: ${branch} for workflow ${name}`, this.config.auditContext);
              fixedBranches.push(branch);
            }
          });

          if (fixedBranches.length > 0) {
            log.debug(`Setting ${fixedBranches.length} fixed branches for workflow ${name}`, this.config.auditContext);
            newWorkflowSchema[workflow.uid].branches = fixedBranches;
          }
        } else {
          log.debug(`No branch configuration for workflow ${name}`, this.config.auditContext);
        }

        if (fixedCts.length) {
          log.debug(`Setting ${fixedCts.length} fixed content types for workflow ${name}`, this.config.auditContext);
          newWorkflowSchema[workflow.uid].content_types = fixedCts;
        } else {
          const { name, uid } = workflow;
          log.debug(`No valid content types for workflow ${name}, considering deletion`, this.config.auditContext);
          const warningMessage = $t(commonMsg.WORKFLOW_FIX_WARN, { name, uid });

          cliux.print(warningMessage, { color: 'yellow' });

          if (this.config.flags.yes || (await cliux.confirm(commonMsg.WORKFLOW_FIX_CONFIRMATION))) {
            log.debug(`Deleting workflow ${name} (${uid})`, this.config.auditContext);
            delete newWorkflowSchema[workflow.uid];
          } else {
            log.debug(`Keeping workflow ${name} (${uid}) despite no valid content types`, this.config.auditContext);
          }
        }
      }
    } else {
      log.debug(`No workflows found to fix`, this.config.auditContext);
    }

    log.debug(`Workflow schema fix completed`, this.config.auditContext);
    await this.writeFixContent(newWorkflowSchema);
  }

  async writeFixContent(newWorkflowSchema: Record<string, Workflow>) {
    log.debug(`Writing fix content`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`, this.config.auditContext);
    log.debug(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, this.config.auditContext);
    log.debug(`Yes flag: ${this.config.flags.yes}`, this.config.auditContext);
    log.debug(`Workflows to write: ${Object.keys(newWorkflowSchema).length}`, this.config.auditContext);
    
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      log.debug(`Writing fixed workflows to: ${outputPath}`, this.config.auditContext);
      
      writeFileSync(outputPath, JSON.stringify(newWorkflowSchema));
      log.debug(`Successfully wrote fixed workflows to file`, this.config.auditContext);
    } else {
      log.debug(`Skipping file write - fix mode disabled or user declined confirmation`, this.config.auditContext);
    }
  }
}
