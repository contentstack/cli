import { join } from 'node:path';
import {
  cliux,
  log,
  messageHandler,
  handleAndLogError,
  HttpClient,
  authenticationHandler,
} from '@contentstack/cli-utilities';
import isEmpty from 'lodash/isEmpty';

import { fsUtil, fileHelper } from '../../utils';
import { ImportConfig, ModuleClassParams, ComposableStudioConfig, ComposableStudioProject } from '../../types';

export default class ImportComposableStudio {
  private importConfig: ImportConfig;
  private composableStudioConfig: ComposableStudioConfig;
  private composableStudioPath: string;
  private composableStudioFilePath: string;
  private apiClient: HttpClient;
  private envUidMapperPath: string;
  private envUidMapper: Record<string, string>;

  constructor({ importConfig }: ModuleClassParams) {
    this.importConfig = importConfig;
    this.importConfig.context.module = 'composable-studio';
    this.composableStudioConfig = importConfig.modules['composable-studio'];

    // Setup paths
    this.composableStudioPath = join(this.importConfig.backupDir, this.composableStudioConfig.dirName);
    this.composableStudioFilePath = join(this.composableStudioPath, this.composableStudioConfig.fileName);
    this.envUidMapperPath = join(this.importConfig.backupDir, 'mapper', 'environments', 'uid-mapping.json');
    this.envUidMapper = {};

    // Initialize HttpClient with Studio API base URL
    this.apiClient = new HttpClient();
    this.apiClient.baseUrl(`${this.composableStudioConfig.apiBaseUrl}/${this.composableStudioConfig.apiVersion}`);
  }

  /**
   * Entry point for Studio import
   */
  async start(): Promise<void> {
    if (this.importConfig.management_token) {
      log.warn('Skipping Studio project import when using management token', this.importConfig.context);
      return;
    }

    log.debug('Starting Studio project import process...', this.importConfig.context);
    cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_IMPORT_START'), { color: 'blue' });

    try {
      // Initialize authentication
      const authInitialized = await this.addAuthHeaders();
      if (!authInitialized) {
        log.warn('Skipping Studio project import when using OAuth authentication', this.importConfig.context);
        return;
      }

      // Load environment UID mapper
      await this.loadEnvironmentMapper();

      // Read exported project data
      const exportedProject = await this.readExportedProject();
      if (!exportedProject) {
        log.info(messageHandler.parse('COMPOSABLE_STUDIO_NOT_FOUND'), this.importConfig.context);
        cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_NOT_FOUND'), { color: 'yellow' });
        return;
      }

      log.debug(`Exported project found: ${exportedProject.name}`, this.importConfig.context);

      // Check if target stack already has a connected project
      const existingProject = await this.getExistingProject();
      if (existingProject) {
        log.warn(messageHandler.parse('COMPOSABLE_STUDIO_SKIP_EXISTING'), this.importConfig.context);
        cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_SKIP_EXISTING'), { color: 'yellow' });
        return;
      }

      // Import the project with name conflict handling
      await this.importProject(exportedProject);

      cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_IMPORT_COMPLETE', exportedProject.name), { color: 'green' });
      log.success(
        messageHandler.parse('COMPOSABLE_STUDIO_IMPORT_COMPLETE', exportedProject.name),
        this.importConfig.context,
      );
    } catch (error) {
      handleAndLogError(error, { ...this.importConfig.context });
    }
  }

  /**
   * Initialize authentication headers for API calls
   */
  async addAuthHeaders(): Promise<boolean> {
    log.debug('Initializing Studio API authentication...', this.importConfig.context);

    // Get authentication details - following personalization-api-adapter pattern
    await authenticationHandler.getAuthDetails();
    const token = authenticationHandler.accessToken;
    log.debug(
      `Authentication type: ${authenticationHandler.isOauthEnabled ? 'OAuth' : 'Token'}`,
      this.importConfig.context,
    );

    // Set authentication headers based on auth type
    if (authenticationHandler.isOauthEnabled) {
      log.debug(
        'Skipping setting OAuth authorization header when using OAuth authentication',
        this.importConfig.context,
      );
      return false;
    } else {
      // TODO: Currenlty assuming if auth type is not OAuth, it is Basic Auth and we are setting authtoken header
      log.debug('Setting authtoken header', this.importConfig.context);
      this.apiClient.headers({ authtoken: token });
    }

    // Set organization_uid header
    this.apiClient.headers({
      organization_uid: this.importConfig.org_uid,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    log.debug('Studio API authentication initialized', this.importConfig.context);
    return true;
  }

  /**
   * Load environment UID mapper from backup directory
   */
  async loadEnvironmentMapper(): Promise<void> {
    log.debug('Loading environment UID mapper...', this.importConfig.context);

    if (fileHelper.fileExistsSync(this.envUidMapperPath)) {
      this.envUidMapper = fileHelper.readFileSync(this.envUidMapperPath) as Record<string, string>;
      log.debug(
        `Environment mapper loaded with ${Object.keys(this.envUidMapper).length} mappings`,
        this.importConfig.context,
      );
    } else {
      log.debug('No environment UID mapper found', this.importConfig.context);
    }
  }

  /**
   * Read exported project from file system
   */
  async readExportedProject(): Promise<ComposableStudioProject | null> {
    log.debug(`Reading exported project from: ${this.composableStudioFilePath}`, this.importConfig.context);

    if (!fileHelper.fileExistsSync(this.composableStudioFilePath)) {
      log.debug('Studio project file does not exist', this.importConfig.context);
      return null;
    }

    const projectData = fileHelper.readFileSync(this.composableStudioFilePath) as ComposableStudioProject;

    if (!projectData || isEmpty(projectData)) {
      log.debug('Studio project file is empty', this.importConfig.context);
      return null;
    }

    return projectData;
  }

  /**
   * Check if target stack already has a connected project
   */
  async getExistingProject(): Promise<ComposableStudioProject | null> {
    log.debug('Checking if target stack already has a connected project...', this.importConfig.context);

    try {
      const apiUrl = '/projects';
      log.debug(
        `Fetching projects from: ${this.composableStudioConfig.apiBaseUrl}${apiUrl}`,
        this.importConfig.context,
      );

      const response = await this.apiClient.get(apiUrl);

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const projects = response.data?.projects || [];
      log.debug(`Found ${projects.length} projects in organization`, this.importConfig.context);

      // Filter projects by connected stack API key
      const connectedProject = projects.find(
        (project: ComposableStudioProject) => project.connectedStackApiKey === this.importConfig.apiKey,
      );

      if (connectedProject) {
        log.debug(`Target stack already has connected project: ${connectedProject.name}`, this.importConfig.context);
        return connectedProject;
      }

      log.debug('Target stack does not have a connected project', this.importConfig.context);
      return null;
    } catch (error) {
      log.debug(`Error checking for existing project: ${error.message}`, this.importConfig.context);
      throw error;
    }
  }

  /**
   * Import project with name conflict handling
   */
  async importProject(exportedProject: ComposableStudioProject): Promise<void> {
    log.debug('Starting project import...', this.importConfig.context);

    // Map environment UID
    const mappedEnvironmentUid = this.mapEnvironmentUid(exportedProject.settings.configuration.environment);

    // Prepare project data for import
    const projectData = {
      name: exportedProject.name,
      connectedStackApiKey: this.importConfig.apiKey,
      contentTypeUid: exportedProject.contentTypeUid,
      description: exportedProject.description || '',
      canvasUrl: exportedProject.canvasUrl || '/',
      settings: {
        configuration: {
          environment: mappedEnvironmentUid,
          locale: exportedProject?.settings?.configuration?.locale || '',
        },
      },
    };

    log.debug(`Project data prepared: ${JSON.stringify(projectData, null, 2)}`, this.importConfig.context);

    // Try to create project with name conflict retry loop
    let projectCreated = false;
    let currentName = projectData.name;
    let attemptCount = 0;

    while (!projectCreated) {
      attemptCount++;
      log.debug(`Attempt ${attemptCount} to create project with name: ${currentName}`, this.importConfig.context);

      projectData.name = currentName;
      const response = await this.apiClient.post('/projects', projectData);

      if (response.status >= 200 && response.status < 300) {
        projectCreated = true;
        log.debug(`Project created successfully with UID: ${response.data?.uid}`, this.importConfig.context);
      } else {
        throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    }
  }

  /**
   * Map environment UID from source to target
   */
  mapEnvironmentUid(sourceEnvUid: string): string {
    if (!sourceEnvUid) {
      log.debug('Source environment UID is empty', this.importConfig.context);
      return '';
    }

    log.debug(`Mapping source environment UID: ${sourceEnvUid}`, this.importConfig.context);

    if (isEmpty(this.envUidMapper)) {
      log.warn(messageHandler.parse('COMPOSABLE_STUDIO_ENV_MAPPING_FAILED', sourceEnvUid), this.importConfig.context);
      return '';
    }

    const mappedUid = this.envUidMapper[sourceEnvUid];

    if (!mappedUid) {
      log.warn(messageHandler.parse('COMPOSABLE_STUDIO_ENV_MAPPING_FAILED', sourceEnvUid), this.importConfig.context);
      return '';
    }

    log.debug(`Mapped environment UID: ${sourceEnvUid} → ${mappedUid}`, this.importConfig.context);
    return mappedUid;
  }

  /**
   * Prompt user for a new project name when conflict occurs
   */
  async promptForNewProjectName(currentName: string): Promise<string> {
    const suggestedName = `Copy of ${currentName}`;

    cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_NAME_CONFLICT', currentName), { color: 'yellow' });
    cliux.print(messageHandler.parse('COMPOSABLE_STUDIO_SUGGEST_NAME', suggestedName), { color: 'cyan' });

    const response: any = await cliux.inquire({
      type: 'input',
      name: 'projectName',
      message: 'Enter new project name:',
      default: suggestedName,
    });

    const newName = response.projectName || suggestedName;
    log.debug(`User provided new project name: ${newName}`, this.importConfig.context);

    return newName;
  }
}
