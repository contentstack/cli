import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ConfigType, ContentTypeStruct, CtConstructorParam, ModuleConstructorParam } from '../types';
import { sanitizePath, cliux, log } from '@contentstack/cli-utilities';

import auditConfig from '../config';
import { $t, auditMsg, commonMsg } from '../messages';
import { ComposableStudioProject } from '../types/composable-studio';

export default class ComposableStudio {
  protected fix: boolean;
  public fileName: string;
  public config: ConfigType;
  public folderPath: string;
  public composableStudioProjects: ComposableStudioProject[];
  public ctSchema: ContentTypeStruct[];
  public moduleName: keyof typeof auditConfig.moduleConfig;
  public ctUidSet: Set<string>;
  public environmentUidSet: Set<string>;
  public localeCodeSet: Set<string>;
  public projectsWithIssues: any[];
  public composableStudioPath: string;
  private projectsWithIssuesMap: Map<string, ComposableStudioProject>;

  constructor({ fix, config, moduleName, ctSchema }: ModuleConstructorParam & Pick<CtConstructorParam, 'ctSchema'>) {
    this.config = config;
    this.fix = fix ?? false;
    this.ctSchema = ctSchema;
    this.composableStudioProjects = [];

    log.debug(`Initializing ComposableStudio module`, this.config.auditContext);
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

    this.ctUidSet = new Set();
    this.environmentUidSet = new Set();
    this.localeCodeSet = new Set();
    this.projectsWithIssues = [];
    this.projectsWithIssuesMap = new Map();
    this.composableStudioPath = '';

    log.debug(`ComposableStudio module initialization completed`, this.config.auditContext);
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

    log.debug(`Module ${moduleName} not found, defaulting to 'composable-studio'`, this.config.auditContext);
    return 'composable-studio';
  }

  /**
   * Load environments from the environments.json file
   */
  async loadEnvironments() {
    log.debug(`Loading environments`, this.config.auditContext);
    const environmentsPath = resolve(this.config.basePath, 'environments', 'environments.json');

    if (existsSync(environmentsPath)) {
      log.debug(`Environments file path: ${environmentsPath}`, this.config.auditContext);
      try {
        const environments = JSON.parse(readFileSync(environmentsPath, 'utf-8'));
        const envArray = Array.isArray(environments) ? environments : Object.values(environments);
        envArray.forEach((env: any) => {
          if (env.uid) {
            this.environmentUidSet.add(env.uid);
          }
        });
        log.debug(
          `Loaded ${this.environmentUidSet.size} environments: ${Array.from(this.environmentUidSet).join(', ')}`,
          this.config.auditContext,
        );
      } catch (error) {
        log.debug(`Failed to load environments: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug(`Environments file not found at: ${environmentsPath}`, this.config.auditContext);
    }
  }

  /**
   * Load locales from the locales.json and master-locale.json files
   */
  async loadLocales() {
    log.debug(`Loading locales`, this.config.auditContext);
    const localesPath = resolve(this.config.basePath, 'locales', 'locales.json');
    const masterLocalePath = resolve(this.config.basePath, 'locales', 'master-locale.json');

    // Load master locale
    if (existsSync(masterLocalePath)) {
      log.debug(`Master locale file path: ${masterLocalePath}`, this.config.auditContext);
      try {
        const masterLocales = JSON.parse(readFileSync(masterLocalePath, 'utf-8'));
        const localeArray = Array.isArray(masterLocales) ? masterLocales : Object.values(masterLocales);
        localeArray.forEach((locale: any) => {
          if (locale.code) {
            this.localeCodeSet.add(locale.code);
          }
        });
        log.debug(`Loaded ${this.localeCodeSet.size} master locales`, this.config.auditContext);
      } catch (error) {
        log.debug(`Failed to load master locales: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug(`Master locale file not found at: ${masterLocalePath}`, this.config.auditContext);
    }

    // Load additional locales
    if (existsSync(localesPath)) {
      log.debug(`Locales file path: ${localesPath}`, this.config.auditContext);
      try {
        const locales = JSON.parse(readFileSync(localesPath, 'utf-8'));
        const localeArray = Array.isArray(locales) ? locales : Object.values(locales);
        localeArray.forEach((locale: any) => {
          if (locale.code) {
            this.localeCodeSet.add(locale.code);
          }
        });
        log.debug(
          `Total locales after loading additional locales: ${this.localeCodeSet.size}`,
          this.config.auditContext,
        );
      } catch (error) {
        log.debug(`Failed to load additional locales: ${error}`, this.config.auditContext);
      }
    } else {
      log.debug(`Locales file not found at: ${localesPath}`, this.config.auditContext);
    }

    log.debug(`Locale codes loaded: ${Array.from(this.localeCodeSet).join(', ')}`, this.config.auditContext);
  }

  /**
   * Main run method to audit composable studio projects
   */
  async run() {
    log.debug(`Starting ${this.moduleName} audit process`, this.config.auditContext);
    log.debug(`Composable Studio folder path: ${this.folderPath}`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);

    if (!existsSync(this.folderPath)) {
      log.debug(`Skipping ${this.moduleName} audit - path does not exist`, this.config.auditContext);
      log.warn(`Skipping ${this.moduleName} audit`, this.config.auditContext);
      cliux.print($t(auditMsg.NOT_VALID_PATH, { path: this.folderPath }), { color: 'yellow' });
      return {};
    }

    this.composableStudioPath = join(this.folderPath, this.fileName);
    log.debug(`Composable Studio file path: ${this.composableStudioPath}`, this.config.auditContext);

    // Load composable studio projects
    log.debug(`Loading composable studio projects from file`, this.config.auditContext);
    if (existsSync(this.composableStudioPath)) {
      try {
        const projectsData = JSON.parse(readFileSync(this.composableStudioPath, 'utf-8'));
        this.composableStudioProjects = Array.isArray(projectsData) ? projectsData : [projectsData];
        log.debug(
          `Loaded ${this.composableStudioProjects.length} composable studio projects`,
          this.config.auditContext,
        );
      } catch (error) {
        log.debug(`Failed to load composable studio projects: ${error}`, this.config.auditContext);
        cliux.print(`Failed to parse composable studio file: ${error}`, { color: 'red' });
        return {};
      }
    } else {
      log.debug(`Composable studio file not found`, this.config.auditContext);
      return {};
    }

    // Build content type UID set
    log.debug(`Building content type UID set from ${this.ctSchema.length} content types`, this.config.auditContext);
    this.ctSchema.forEach((ct) => this.ctUidSet.add(ct.uid));
    log.debug(`Content type UID set contains: ${Array.from(this.ctUidSet).join(', ')}`, this.config.auditContext);

    // Load environments and locales
    await this.loadEnvironments();
    await this.loadLocales();

    // Process each project
    log.debug(
      `Processing ${this.composableStudioProjects.length} composable studio projects`,
      this.config.auditContext,
    );
    for (const project of this.composableStudioProjects) {
      const { name, uid, contentTypeUid, settings } = project;
      log.debug(`Processing composable studio project: ${name} (${uid})`, this.config.auditContext);
      log.debug(`Content type UID: ${contentTypeUid}`, this.config.auditContext);
      log.debug(`Environment: ${settings?.configuration?.environment}`, this.config.auditContext);
      log.debug(`Locale: ${settings?.configuration?.locale}`, this.config.auditContext);

      let hasIssues = false;
      const issuesList: string[] = [];
      const invalidContentTypes: string[] = [];
      const invalidEnvironments: string[] = [];
      const invalidLocales: string[] = [];

      // Check content type
      if (contentTypeUid && !this.ctUidSet.has(contentTypeUid)) {
        log.debug(`Content type ${contentTypeUid} not found in project ${name}`, this.config.auditContext);
        invalidContentTypes.push(contentTypeUid);
        issuesList.push(`Invalid contentTypeUid: ${contentTypeUid}`);
        hasIssues = true;
      }

      // Check environment
      if (settings?.configuration?.environment && !this.environmentUidSet.has(settings.configuration.environment)) {
        log.debug(
          `Environment ${settings.configuration.environment} not found in project ${name}`,
          this.config.auditContext,
        );
        invalidEnvironments.push(settings.configuration.environment);
        issuesList.push(`Invalid environment: ${settings.configuration.environment}`);
        hasIssues = true;
      }

      // Check locale
      if (settings?.configuration?.locale && !this.localeCodeSet.has(settings.configuration.locale)) {
        log.debug(`Locale ${settings.configuration.locale} not found in project ${name}`, this.config.auditContext);
        invalidLocales.push(settings.configuration.locale);
        issuesList.push(`Invalid locale: ${settings.configuration.locale}`);
        hasIssues = true;
      }

      if (hasIssues) {
        log.debug(`Project ${name} has validation issues`, this.config.auditContext);
        // Store the original project for fixing
        this.projectsWithIssuesMap.set(uid, project);

        // Create a report-friendly object
        const reportEntry: any = {
          title: name,
          name: name,
          uid: uid,
          content_types: invalidContentTypes.length > 0 ? invalidContentTypes : undefined,
          environment: invalidEnvironments.length > 0 ? invalidEnvironments : undefined,
          locale: invalidLocales.length > 0 ? invalidLocales : undefined,
          issues: issuesList.join(', '),
        };
        this.projectsWithIssues.push(reportEntry);
      } else {
        log.debug(`Project ${name} has no validation issues`, this.config.auditContext);
      }

      log.info(
        $t(auditMsg.SCAN_CS_SUCCESS_MSG, {
          name,
          uid,
        }),
        this.config.auditContext,
      );
    }

    log.debug(
      `Composable Studio audit completed. Found ${this.projectsWithIssues.length} projects with issues`,
      this.config.auditContext,
    );

    if (this.fix && this.projectsWithIssues.length) {
      log.debug(`Fix mode enabled, fixing ${this.projectsWithIssues.length} projects`, this.config.auditContext);
      await this.fixComposableStudioProjects();
      this.projectsWithIssues.forEach((project) => {
        log.debug(`Marking project ${project.name} as fixed`, this.config.auditContext);
        project.fixStatus = 'Fixed';
      });
      log.debug(`Composable Studio fix completed`, this.config.auditContext);
      return this.projectsWithIssues;
    }

    log.debug(`Composable Studio audit completed without fixes`, this.config.auditContext);
    return this.projectsWithIssues;
  }

  /**
   * Fix composable studio projects by removing invalid references
   */
  async fixComposableStudioProjects() {
    log.debug(`Starting composable studio projects fix`, this.config.auditContext);

    log.debug(
      `Loading current composable studio projects from: ${this.composableStudioPath}`,
      this.config.auditContext,
    );
    let projectsData: any;
    try {
      projectsData = JSON.parse(readFileSync(this.composableStudioPath, 'utf-8'));
    } catch (error) {
      log.debug(`Failed to load composable studio projects for fixing: ${error}`, this.config.auditContext);
      return;
    }

    const isArray = Array.isArray(projectsData);
    const projects: ComposableStudioProject[] = isArray ? projectsData : [projectsData];

    log.debug(`Loaded ${projects.length} projects for fixing`, this.config.auditContext);

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const { uid, name } = project;
      log.debug(`Fixing project: ${name} (${uid})`, this.config.auditContext);

      let needsFix = false;

      // Check and fix content type
      if (project.contentTypeUid && !this.ctUidSet.has(project.contentTypeUid)) {
        log.debug(
          `Removing invalid content type ${project.contentTypeUid} from project ${name}`,
          this.config.auditContext,
        );
        cliux.print(
          `Warning: Project "${name}" has invalid content type "${project.contentTypeUid}". It will be removed.`,
          { color: 'yellow' },
        );
        (project as any).contentTypeUid = undefined;
        needsFix = true;
      }

      // Check and fix environment
      if (
        project.settings?.configuration?.environment &&
        !this.environmentUidSet.has(project.settings.configuration.environment)
      ) {
        log.debug(
          `Removing invalid environment ${project.settings.configuration.environment} from project ${name}`,
          this.config.auditContext,
        );
        cliux.print(
          `Warning: Project "${name}" has invalid environment "${project.settings.configuration.environment}". It will be removed.`,
          { color: 'yellow' },
        );
        (project.settings.configuration as any).environment = undefined;
        needsFix = true;
      }

      // Check and fix locale
      if (project.settings?.configuration?.locale && !this.localeCodeSet.has(project.settings.configuration.locale)) {
        log.debug(
          `Removing invalid locale ${project.settings.configuration.locale} from project ${name}`,
          this.config.auditContext,
        );
        cliux.print(
          `Warning: Project "${name}" has invalid locale "${project.settings.configuration.locale}". It will be removed.`,
          { color: 'yellow' },
        );
        (project.settings.configuration as any).locale = undefined;
        needsFix = true;
      }

      if (needsFix) {
        log.debug(`Project ${name} was fixed`, this.config.auditContext);
      } else {
        log.debug(`Project ${name} did not need fixing`, this.config.auditContext);
      }
    }

    log.debug(`Composable studio projects fix completed, writing updated file`, this.config.auditContext);
    await this.writeFixContent(isArray ? projects : projects[0]);
  }

  /**
   * Write fixed composable studio projects back to file
   */
  async writeFixContent(fixedProjects: any) {
    log.debug(`Writing fix content`, this.config.auditContext);
    log.debug(`Fix mode: ${this.fix}`, this.config.auditContext);
    log.debug(`Copy directory flag: ${this.config.flags['copy-dir']}`, this.config.auditContext);
    log.debug(
      `External config skip confirm: ${this.config.flags['external-config']?.skipConfirm}`,
      this.config.auditContext,
    );
    log.debug(`Yes flag: ${this.config.flags.yes}`, this.config.auditContext);

    if (
      this.fix &&
      (this.config.flags['copy-dir'] ||
        this.config.flags['external-config']?.skipConfirm ||
        this.config.flags.yes ||
        (await cliux.confirm(commonMsg.FIX_CONFIRMATION)))
    ) {
      const outputPath = join(this.folderPath, this.config.moduleConfig[this.moduleName].fileName);
      log.debug(`Writing fixed composable studio projects to: ${outputPath}`, this.config.auditContext);

      writeFileSync(outputPath, JSON.stringify(fixedProjects, null, 2));
      log.debug(`Successfully wrote fixed composable studio projects to file`, this.config.auditContext);
    } else {
      log.debug(`Skipping file write - fix mode disabled or user declined confirmation`, this.config.auditContext);
    }
  }
}
