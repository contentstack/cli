import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';
import { cliux, sanitizePath, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class Workflows {
  protected fix: boolean;
  public fileName: any;
  public config: ConfigType;
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
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.workflowSchema = [];
    
    log.debug(`Initializing Workflows module`);
    log.debug(`Fix mode: ${this.fix}`);
    log.debug(`Content types count: ${ctSchema.length}`);
    log.debug(`Module name: ${moduleName}`);
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    log.debug(`File name: ${this.fileName}`);
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    log.debug(`Folder path: ${this.folderPath}`);
    
    this.ctUidSet = new Set(['$all']);
    this.missingCtInWorkflows = [];
    this.missingCts = new Set();
    this.workflowPath = '';
    this.isBranchFixDone = false;
    
    log.debug(`Workflows module initialization completed`);
  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    log.debug(`Validating module: ${moduleName}`);
    log.debug(`Available modules: ${Object.keys(moduleConfig).join(', ')}`);
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      log.debug(`Module ${moduleName} is valid`);
      return moduleName;
    }
    
    log.debug(`Module ${moduleName} not found, defaulting to 'workflows'`);
    return 'workflows';
  }

  /**
   * Check whether the given path for the workflow exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the workflow name, uid and content_types that are missing
   */
  async run() {
    
    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`);
      log.warn(`Skipping ${this.moduleName} audit`);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.workflowPath = join(this.folderPath, this.fileName);
    log.debug(`Workflows file path: ${this.workflowPath}`);

    log.debug(`Loading workflows schema from file`);
    this.workflowSchema = existsSync(this.workflowPath)
      ? values(JSON.parse(readFileSync(this.workflowPath, 'utf8')) as Workflow[])
      : [];
    log.debug(`Loaded ${this.workflowSchema.length} workflows`);

    log.debug(`Building content type UID set from ${this.ctSchema.length} content types`);
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
    log.debug(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`);

    log.debug(`Processing ${this.workflowSchema.length} workflows`);
    for (const workflow of this.workflowSchema) {
      const { name, uid } = workflow;
      log.debug(`Processing workflow: ${name} (${uid})`);
      log.debug(`Workflow content types: ${workflow.content_types?.join(', ') || 'none'}`);
      log.debug(`Workflow branches: ${workflow.branches?.join(', ') || 'none'}`);
      
      const ctNotPresent = workflow.content_types.filter((ct) => !this.ctUidSet.has(ct));
      log.debug(`Missing content types in workflow: ${ctNotPresent?.join(', ') || 'none'}`);
      log.debug(`Config branch : ${this.config.branch}`);

      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        branchesToBeRemoved = workflow?.branches?.filter((branch) => branch !== this.config?.branch) || [];
        log.debug(`Branches to be removed: ${branchesToBeRemoved?.join(', ') || 'none'}`);
      } else {
        log.debug(`No branch configuration found`);
      }

      if (ctNotPresent.length || branchesToBeRemoved?.length) {
        log.debug(`Workflow ${name} has issues - missing content types: ${ctNotPresent.length}, branches to remove: ${branchesToBeRemoved.length}`);
        
        const tempwf = cloneDeep(workflow);
        tempwf.content_types = ctNotPresent || [];

        if (workflow?.branches && this.config?.branch) {
          tempwf.branches = branchesToBeRemoved;
        }

        if (branchesToBeRemoved?.length) {
          log.debug(`Branch fix will be needed`);
          this.isBranchFixDone = true;
        }

        ctNotPresent.forEach((ct) => {
          log.debug(`Adding missing content type: ${ct} to the Audit report.`);
          this.missingCts.add(ct);
        });
        this.missingCtInWorkflows.push(tempwf);
      } else {
        log.debug(`Workflow ${name} has no issues`);
      }

      log.info(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          uid: workflow.uid,
        })
      );
    }

    log.debug(`Workflows audit completed. Found ${this.missingCtInWorkflows.length} workflows with issues`);
    log.debug(`Total missing content types: ${this.missingCts.size}`);
    log.debug(`Branch fix needed: ${this.isBranchFixDone}`);

    if (this.fix && (this.missingCtInWorkflows.length || this.isBranchFixDone)) {
      log.debug(`Fix mode enabled, fixing ${this.missingCtInWorkflows.length} workflows`);
      await this.fixWorkflowSchema();
      this.missingCtInWorkflows.forEach((wf) => {
        log.debug(`Marking workflow ${wf.name} as fixed`);
        wf.fixStatus = 'Fixed';
      });
      log.debug(`Workflows fix completed`);
      return this.missingCtInWorkflows;
    }
    
    log.debug(`Workflows audit completed without fixes`);
    return this.missingCtInWorkflows;
  }

  async fixWorkflowSchema() {
    log.debug(`Starting workflow schema fix`);
    
    const newWorkflowSchema: Record<string, Workflow> = existsSync(this.workflowPath)
      ? JSON.parse(readFileSync(this.workflowPath, 'utf8'))
      : {};
    
    log.debug(`Loaded ${Object.keys(newWorkflowSchema).length} workflows for fixing`);

    if (Object.keys(newWorkflowSchema).length !== 0) {
      log.debug(`Processing ${this.workflowSchema.length} workflows for fixes`);
      
      for (const workflow of this.workflowSchema) {
        const { name, uid } = workflow;
        log.debug(`Fixing workflow: ${name} (${uid})`);
        
        const fixedCts = workflow.content_types.filter((ct) => !this.missingCts.has(ct));
        log.debug(`Fixed content types: ${fixedCts.join(', ') || 'none'}`);
        
        const fixedBranches: string[] = [];

        if (this.config.branch) {
          log.debug(`Config branch : ${this.config.branch}`);
          log.debug(`Processing branches for workflow ${name}`);
          workflow?.branches?.forEach((branch) => {
            if (branch !== this.config?.branch) {
              log.debug(`Removing branch: ${branch} from workflow ${name}`);
              cliux.print($t(commonMsg.WF_BRANCH_REMOVAL, { uid, name, branch }), { color: 'yellow' });
            } else {
              log.debug(`Keeping branch: ${branch} for workflow ${name}`);
              fixedBranches.push(branch);
            }
          });

          if (fixedBranches.length > 0) {
            log.debug(`Setting ${fixedBranches.length} fixed branches for workflow ${name}`);
            newWorkflowSchema[workflow.uid].branches = fixedBranches;
          }
        } else {
          log.debug(`No branch configuration for workflow ${name}`);
        }

        if (fixedCts.length) {
          log.debug(`Setting ${fixedCts.length} fixed content types for workflow ${name}`);
          newWorkflowSchema[workflow.uid].content_types = fixedCts;
        } else {
          const { name, uid } = workflow;
          log.debug(`No valid content types for workflow ${name}, considering deletion`);
          const warningMessage = $t(commonMsg.WORKFLOW_FIX_WARN, { name, uid });

          cliux.print(warningMessage, { color: 'yellow' });

          if (this.config.flags.yes || (await cliux.confirm(commonMsg.WORKFLOW_FIX_CONFIRMATION))) {
            log.debug(`Deleting workflow ${name} (${uid})`);
            delete newWorkflowSchema[workflow.uid];
          } else {
            log.debug(`Keeping workflow ${name} (${uid}) despite no valid content types`);
          }
        }
      }
    } else {
      log.debug(`No workflows found to fix`);
    }

    log.debug(`Workflow schema fix completed`);
    await this.writeFixContent(newWorkflowSchema);
  }

  async writeFixContent(newWorkflowSchema: Record<string, Workflow>) {
    log.debug(`Writing fix content`);
    log.debug(`Fix mode: ${this.fix}`);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`);
    log.debug(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`);
    log.debug(`Yes flag: ${this.config.flags.yes}`);
    log.debug(`Workflows to write: ${Object.keys(newWorkflowSchema).length}`);
    
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      log.debug(`Writing fixed workflows to: ${outputPath}`);
      
      writeFileSync(outputPath, JSON.stringify(newWorkflowSchema));
      log.debug(`Successfully wrote fixed workflows to file`);
    } else {
      log.debug(`Skipping file write - fix mode disabled or user declined confirmation`);
    }
  }
}
