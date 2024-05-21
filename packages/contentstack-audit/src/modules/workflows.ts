import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';
import { sanitizePath, ux } from '@contentstack/cli-utilities';

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
    this.moduleName = this.validateModules(moduleName!, this.config.moduleConfig);
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(sanitizePath(config.basePath), sanitizePath(config.moduleConfig[this.moduleName].dirName));
    this.ctUidSet = new Set(['$all']);
    this.missingCtInWorkflows = [];
    this.missingCts = new Set();
    this.workflowPath = '';
    this.isBranchFixDone = false;
  }
  validateModules(moduleName: keyof typeof auditConfig.moduleConfig, moduleConfig: Record<string, unknown>): keyof typeof auditConfig.moduleConfig {
    if (Object.keys(moduleConfig).includes(moduleName)) {
      return moduleName;
    }
    return 'workflows'
  }

  /**
   * Check whether the given path for the workflow exists or not
   * If path exist read
   * From the ctSchema add all the content type UID into ctUidSet to check whether the content-type is present or not
   * @returns Array of object containing the workflow name, uid and content_types that are missing
   */
  async run() {
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.workflowPath = join(this.folderPath, this.fileName);
    this.workflowSchema = existsSync(this.workflowPath)
      ? values(JSON.parse(readFileSync(this.workflowPath, 'utf8')) as Workflow[])
      : [];

    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));

    for (const workflow of this.workflowSchema) {
      const ctNotPresent = workflow.content_types.filter((ct) => !this.ctUidSet.has(ct));
      let branchesToBeRemoved: string[] = [];
      if (this.config?.branch) {
        branchesToBeRemoved = workflow?.branches?.filter((branch) => branch !== this.config?.branch) || [];
      }

      if (ctNotPresent.length || branchesToBeRemoved?.length) {
        const tempwf = cloneDeep(workflow);
        tempwf.content_types = ctNotPresent || [];

        if (workflow?.branches && this.config?.branch) {
          tempwf.branches = branchesToBeRemoved;
        }

        if (branchesToBeRemoved?.length) {
          this.isBranchFixDone = true;
        }

        ctNotPresent.forEach((ct) => this.missingCts.add(ct));
        this.missingCtInWorkflows.push(tempwf);
      }

      this.log(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          uid: workflow.uid,
        }),
        'info',
      );
    }

    if (this.fix && (this.missingCtInWorkflows.length || this.isBranchFixDone)) {
      await this.fixWorkflowSchema();
      this.missingCtInWorkflows.forEach((wf) => (wf.fixStatus = 'Fixed'));
    }

    return this.missingCtInWorkflows;
  }

  async fixWorkflowSchema() {
    const newWorkflowSchema: Record<string, Workflow> = existsSync(this.workflowPath)
      ? JSON.parse(readFileSync(this.workflowPath, 'utf8'))
      : {};

    if (Object.keys(newWorkflowSchema).length !== 0) {
      for (const workflow of this.workflowSchema) {
        const fixedCts = workflow.content_types.filter((ct) => !this.missingCts.has(ct));
        const fixedBranches: string[] = [];

        if (this.config.branch) {
          workflow?.branches?.forEach((branch) => {
            if (branch !== this.config?.branch) {
              const { uid, name } = workflow;
              this.log($t(commonMsg.WF_BRANCH_REMOVAL, { uid, name, branch }), { color: 'yellow' });
            } else {
              fixedBranches.push(branch);
            }
          });

          if (fixedBranches.length > 0) {
            newWorkflowSchema[workflow.uid].branches = fixedBranches;
          }
        }

        if (fixedCts.length) {
          newWorkflowSchema[workflow.uid].content_types = fixedCts;
        } else {
          const { name, uid } = workflow;
          const warningMessage = $t(commonMsg.WORKFLOW_FIX_WARN, { name, uid });

          this.log(warningMessage, { color: 'yellow' });

          if (this.config.flags.yes || (await ux.confirm(commonMsg.WORKFLOW_FIX_CONFIRMATION))) {
            delete newWorkflowSchema[workflow.uid];
          }
        }
      }
    }

    await this.writeFixContent(newWorkflowSchema);
  }

  async writeFixContent(newWorkflowSchema: Record<string, Workflow>) {
    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await ux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      writeFileSync(
        join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
        JSON.stringify(newWorkflowSchema),
      );
    }
  }
}
