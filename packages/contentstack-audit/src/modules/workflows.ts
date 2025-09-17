import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';
import { cliux, sanitizePath } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { values } from 'lodash';

export default class Workflows {
  public log: LogFn;
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
    log,
    fix,
    config,
    moduleName,
    ctSchema,
  }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.workflowSchema = [];
    
    this.log(`Initializing Workflows module`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Content types count: ${ctSchema.length}`, 'debug');
    this.log(`Module name: ${moduleName}`, 'debug');
    
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.log(`File name: ${this.fileName}`, 'debug');
    
    this.folderPath = resolve(
      sanitizePath(config.basePath),
      sanitizePath(config.moduleConfig[this.moduleName].dirName),
    );
    this.log(`Folder path: ${this.folderPath}`, 'debug');
    
    this.ctUidSet = new Set(['$all']);
    this.missingCtInWorkflows = [];
    this.missingCts = new Set();
    this.workflowPath = '';
    this.isBranchFixDone = false;
    
    this.log(`Workflows module initialization completed`, 'debug');
  }
  validateModules(
    moduleName: keyof typeof auditConfig.moduleConfig,
    moduleConfig: Record<string, unknown>,
  ): keyof typeof auditConfig.moduleConfig {
    this.log(`Validating module: ${moduleName}`, 'debug');
    this.log(`Available modules: ${Object.keys(moduleConfig).join(', ')}`, 'debug');
    
    if (Object.keys(moduleConfig).includes(moduleName)) {
      this.log(`Module ${moduleName} is valid`, 'debug');
      return moduleName;
    }
    
    this.log(`Module ${moduleName} not found, defaulting to 'workflows'`, 'debug');
    return 'workflows';
  }

  /**
   * Check whether the given path for the workflow exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the workflow name, uid and content_types that are missing
   */
  async run() {
    this.log(`Starting ${this.moduleName} audit process`, 'debug');
    this.log(`Workflows folder path: ${this.folderPath}`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit - path does not exist`, 'debug');
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.workflowPath = join(this.folderPath, this.fileName);
    this.log(`Workflows file path: ${this.workflowPath}`, 'debug');

    this.log(`Loading workflows schema from file`, 'debug');
    this.workflowSchema = existsSync(this.workflowPath)
      ? values(JSON.parse(readFileSync(this.workflowPath, 'utf8')) as Workflow[])
      : [];
    this.log(`Loaded ${this.workflowSchema.length} workflows`, 'debug');

    this.log(`Building content type UID set from ${this.ctSchema.length} content types`, 'debug');
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
    this.log(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`, 'debug');

    this.log(`Processing ${this.workflowSchema.length} workflows`, 'debug');
    for (const workflow of this.workflowSchema) {
      const { name, uid } = workflow;
      this.log(`Processing workflow: ${name} (${uid})`, 'debug');
      this.log(`Workflow content types: ${workflow.content_types?.join(', ') || 'none'}`, 'debug');
      this.log(`Workflow branches: ${workflow.branches?.join(', ') || 'none'}`, 'debug');
      
      const ctNotPresent = workflow.content_types.filter((ct) => !this.ctUidSet.has(ct));
      this.log(`Missing content types in workflow: ${ctNotPresent?.join(', ') || 'none'}`, 'debug');
      
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        branchesToBeRemoved = workflow?.branches?.filter((branch) => branch !== this.config?.branch) || [];
        this.log(`Branches to be removed: ${branchesToBeRemoved?.join(', ') || 'none'}`, 'debug');
      } else {
        this.log(`No branch configuration found`, 'debug');
      }

      if (ctNotPresent.length || branchesToBeRemoved?.length) {
        this.log(`Workflow ${name} has issues - missing content types: ${ctNotPresent.length}, branches to remove: ${branchesToBeRemoved.length}`, 'debug');
        
        const tempwf = cloneDeep(workflow);
        tempwf.content_types = ctNotPresent || [];

        if (workflow?.branches && this.config?.branch) {
          tempwf.branches = branchesToBeRemoved;
        }

        if (branchesToBeRemoved?.length) {
          this.log(`Branch fix will be needed`, 'debug');
          this.isBranchFixDone = true;
        }

        ctNotPresent.forEach((ct) => {
          this.log(`Adding missing content type: ${ct}`, 'debug');
          this.missingCts.add(ct);
        });
        this.missingCtInWorkflows.push(tempwf);
      } else {
        this.log(`Workflow ${name} has no issues`, 'debug');
      }

      this.log(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          uid: workflow.uid,
        }),
        'info',
      );
    }

    this.log(`Workflows audit completed. Found ${this.missingCtInWorkflows.length} workflows with issues`, 'debug');
    this.log(`Total missing content types: ${this.missingCts.size}`, 'debug');
    this.log(`Branch fix needed: ${this.isBranchFixDone}`, 'debug');

    if (this.fix && (this.missingCtInWorkflows.length || this.isBranchFixDone)) {
      this.log(`Fix mode enabled, fixing ${this.missingCtInWorkflows.length} workflows`, 'debug');
      await this.fixWorkflowSchema();
      this.missingCtInWorkflows.forEach((wf) => {
        this.log(`Marking workflow ${wf.name} as fixed`, 'debug');
        wf.fixStatus = 'Fixed';
      });
      this.log(`Workflows fix completed`, 'debug');
      return this.missingCtInWorkflows;
    }
    
    this.log(`Workflows audit completed without fixes`, 'debug');
    return this.missingCtInWorkflows;
  }

  async fixWorkflowSchema() {
    this.log(`Starting workflow schema fix`, 'debug');
    
    const newWorkflowSchema: Record<string, Workflow> = existsSync(this.workflowPath)
      ? JSON.parse(readFileSync(this.workflowPath, 'utf8'))
      : {};
    
    this.log(`Loaded ${Object.keys(newWorkflowSchema).length} workflows for fixing`, 'debug');

    if (Object.keys(newWorkflowSchema).length !== 0) {
      this.log(`Processing ${this.workflowSchema.length} workflows for fixes`, 'debug');
      
      for (const workflow of this.workflowSchema) {
        const { name, uid } = workflow;
        this.log(`Fixing workflow: ${name} (${uid})`, 'debug');
        
        const fixedCts = workflow.content_types.filter((ct) => !this.missingCts.has(ct));
        this.log(`Fixed content types: ${fixedCts.join(', ') || 'none'}`, 'debug');
        
        const fixedBranches: string[] = [];

        if (this.config.branch) {
          this.log(`Processing branches for workflow ${name}`, 'debug');
          workflow?.branches?.forEach((branch) => {
            if (branch !== this.config?.branch) {
              this.log(`Removing branch: ${branch} from workflow ${name}`, 'debug');
              this.log($t(commonMsg.WF_BRANCH_REMOVAL, { uid, name, branch }), { color: 'yellow' });
            } else {
              this.log(`Keeping branch: ${branch} for workflow ${name}`, 'debug');
              fixedBranches.push(branch);
            }
          });

          if (fixedBranches.length > 0) {
            this.log(`Setting ${fixedBranches.length} fixed branches for workflow ${name}`, 'debug');
            newWorkflowSchema[workflow.uid].branches = fixedBranches;
          }
        } else {
          this.log(`No branch configuration for workflow ${name}`, 'debug');
        }

        if (fixedCts.length) {
          this.log(`Setting ${fixedCts.length} fixed content types for workflow ${name}`, 'debug');
          newWorkflowSchema[workflow.uid].content_types = fixedCts;
        } else {
          const { name, uid } = workflow;
          this.log(`No valid content types for workflow ${name}, considering deletion`, 'debug');
          const warningMessage = $t(commonMsg.WORKFLOW_FIX_WARN, { name, uid });

          this.log(warningMessage, { color: 'yellow' });

          if (this.config.flags.yes || (await cliux.confirm(commonMsg.WORKFLOW_FIX_CONFIRMATION))) {
            this.log(`Deleting workflow ${name} (${uid})`, 'debug');
            delete newWorkflowSchema[workflow.uid];
          } else {
            this.log(`Keeping workflow ${name} (${uid}) despite no valid content types`, 'debug');
          }
        }
      }
    } else {
      this.log(`No workflows found to fix`, 'debug');
    }

    this.log(`Workflow schema fix completed`, 'debug');
    await this.writeFixContent(newWorkflowSchema);
  }

  async writeFixContent(newWorkflowSchema: Record<string, Workflow>) {
    this.log(`Writing fix content`, 'debug');
    this.log(`Fix mode: ${this.fix}`, 'debug');
    this.log(`Copy directory flag: ${this.config.flags['copy-dir']}`, 'debug');
    this.log(`External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`, 'debug');
    this.log(`Yes flag: ${this.config.flags.yes}`, 'debug');
    this.log(`Workflows to write: ${Object.keys(newWorkflowSchema).length}`, 'debug');
    
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      this.log(`Writing fixed workflows to: ${outputPath}`, 'debug');
      
      writeFileSync(outputPath, JSON.stringify(newWorkflowSchema));
      this.log(`Successfully wrote fixed workflows to file`, 'debug');
    } else {
      this.log(`Skipping file write - fix mode disabled or user declined confirmation`, 'debug');
    }
  }
}
