import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cloneDeep } from 'lodash';
import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';
import { ux } from '@contentstack/cli-utilities';

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
    this.moduleName = moduleName ?? 'workflows';
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(config.basePath, config.moduleConfig[this.moduleName].dirName);
    this.ctUidSet = new Set(['$all']);
    this.missingCtInWorkflows = [];
    this.missingCts = new Set();
    this.workflowPath = '';
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
    this.workflowSchema = existsSync(this.workflowPath) ? values(JSON.parse(readFileSync(this.workflowPath, 'utf8')) as Workflow[]) : [];
  
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
  
    for (const workflow of this.workflowSchema) {
      const ctNotPresent = workflow.content_types.filter((ct) => !this.ctUidSet.has(ct));
      if (ctNotPresent.length) {
        const tempwf = cloneDeep(workflow);
        tempwf.content_types = ctNotPresent;
        this.missingCtInWorkflows.push(tempwf);
      }
  
      this.log(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          module: this.config.moduleConfig[this.moduleName].name,
        }),
        'info'
      );
    }
  
    if (this.fix && this.missingCtInWorkflows.length) {
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
      !(this.config.flags['copy-dir'] || this.config.flags['external-config']?.skipConfirm) &&
      (this.config.flags.yes || (await ux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      writeFileSync(
        join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName),
        JSON.stringify(newWorkflowSchema),
      );
    }
  }
}
