import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

import { LogFn, ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam, Workflow } from '../types';

import auditConfig from '../config';
import { $t, auditMsg } from '../messages';
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
  public fixWorkflowSchema: Workflow[];

  constructor({ log, fix, config, moduleName, ctSchema }: ModuleConstructorParam & CtConstructorParam) {
    this.log = log;
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.workflowSchema = [];
    this.moduleName = moduleName ?? 'workflows';
    this.fileName = config.moduleConfig[this.moduleName].fileName;
    this.folderPath = resolve(config.basePath, config.moduleConfig[this.moduleName].dirName);
    this.ctUidSet = new Set(['$all']);
    this.fixWorkflowSchema = [];
  }

  run() {
    if (!existsSync(this.folderPath)) {
      this.log(`Skipping ${this.moduleName} audit`, 'warn');
      this.log($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
    }
    const workflowPath = join(this.folderPath, this.fileName);
    this.workflowSchema = existsSync(workflowPath)
      ? values(JSON.parse(readFileSync(workflowPath, 'utf8')) as Workflow[])
      : [];

    let deleteKey: string[] = ['org_uid', 'api_key', 'workflow_stages', 'admin_users', 'enabled', 'deleted_at'];
    this.workflowSchema.forEach((workflow: any) => {
      deleteKey.forEach((key) => {
        delete workflow[key];
      });
    });
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
    this.workflowSchema.forEach((workflow: Workflow) => {
      let ctNotPresent: string[] = [];
      workflow.content_types.forEach((ct) => {
        if (!this.ctUidSet.has(ct)) {
          ctNotPresent.push(ct);
        }
      });
      if (ctNotPresent.length) {
        workflow.content_types = ctNotPresent;
        this.fixWorkflowSchema.push(workflow);
      }
      this.log(
        $t(auditMsg.SCAN_WF_SUCCESS_MSG, {
          name: workflow.name,
          module: this.config.moduleConfig[this.moduleName].name,
        }),
        'info',
      );
    });
    return this.fixWorkflowSchema;
  }
}
