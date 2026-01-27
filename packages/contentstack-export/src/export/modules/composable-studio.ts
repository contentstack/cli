import { resolve as pResolve } from 'node:path';
import {
  cliux,
  isAuthenticated,
  log,
  messageHandler,
  handleAndLogError,
  HttpClient,
  authenticationHandler,
} from '@contentstack/cli-utilities';

import { fsUtil, getOrgUid } from '../../utils';
import { ModuleClassParams, ComposableStudioConfig, ExportConfig, ComposableStudioProject } from '../../types';

export default class ExportComposableStudio {
  protected composableStudioConfig: ComposableStudioConfig;
  protected composableStudioProject: ComposableStudioProject | null = null;
  protected apiClient: HttpClient;
  public composableStudioPath: string;
  public exportConfig: ExportConfig;

  constructor({ exportConfig }: Omit<ModuleClassParams, 'stackAPIClient' | 'moduleName'>) {
    this.exportConfig = exportConfig;
    this.composableStudioConfig = exportConfig.modules['composable-studio'];
    this.exportConfig.context.module = 'composable-studio';

    // Initialize HttpClient with Studio API base URL
    this.apiClient = new HttpClient();
    this.apiClient.baseUrl(`${this.composableStudioConfig.apiBaseUrl}/${this.composableStudioConfig.apiVersion}`);
  }

  async start(): Promise<void> {
    log.debug('Starting Studio project export process...', this.exportConfig.context);

    if (!isAuthenticated()) {
      cliux.print(
        'WARNING!!! To export Studio projects, you must be logged in. Please check csdx auth:login --help to log in',
        { color: 'yellow' },
      );
      return Promise.resolve();
    }

    this.composableStudioPath = pResolve(
      this.exportConfig.exportDir,
      this.exportConfig.branchName || '',
      this.composableStudioConfig.dirName,
    );
    log.debug(`Studio folder path: ${this.composableStudioPath}`, this.exportConfig.context);

    await fsUtil.makeDirectory(this.composableStudioPath);
    log.debug('Created Studio directory', this.exportConfig.context);

    this.exportConfig.org_uid = this.exportConfig.org_uid || (await getOrgUid(this.exportConfig));
    log.debug(`Organization UID: ${this.exportConfig.org_uid}`, this.exportConfig.context);

    await this.exportProjects();
    log.debug('Studio project export process completed', this.exportConfig.context);
  }

  /**
   * Export Studio projects connected to the current stack
   */
  async exportProjects(): Promise<void> {
    log.debug('Starting Studio project export...', this.exportConfig.context);

    try {
      // Get authentication details - following personalization-api-adapter pattern
      log.debug('Initializing Studio API authentication...', this.exportConfig.context);
      await authenticationHandler.getAuthDetails();
      const token = authenticationHandler.accessToken;
      log.debug(
        `Authentication type: ${authenticationHandler.isOauthEnabled ? 'OAuth' : 'Token'}`,
        this.exportConfig.context,
      );

      // Set authentication headers based on auth type
      if (authenticationHandler.isOauthEnabled) {
        log.debug('Setting OAuth authorization header', this.exportConfig.context);
        this.apiClient.headers({ authorization: token });
      } else {
        log.debug('Setting authtoken header', this.exportConfig.context);
        this.apiClient.headers({ authtoken: token });
      }

      // Set organization_uid header
      this.apiClient.headers({
        organization_uid: this.exportConfig.org_uid,
        Accept: 'application/json',
      });

      const apiUrl = '/projects';
      log.debug(
        `Fetching projects from: ${this.composableStudioConfig.apiBaseUrl}${apiUrl}`,
        this.exportConfig.context,
      );

      // Make API call to fetch projects using HttpClient
      const response = await this.apiClient.get(apiUrl);

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const data = response.data;
      log.debug(`Fetched ${data.projects?.length || 0} total projects`, this.exportConfig.context);

      // Filter projects connected to this stack
      const connectedProject = data.projects?.filter(
        (project: ComposableStudioProject) => project.connectedStackApiKey === this.exportConfig.apiKey,
      );

      if (!connectedProject || connectedProject.length === 0) {
        log.info(messageHandler.parse('COMPOSABLE_STUDIO_NOT_FOUND'), this.exportConfig.context);
        return;
      }

      // Use the first connected project (stacks should have only one project)
      this.composableStudioProject = connectedProject[0];
      log.debug(`Found Studio project: ${this.composableStudioProject.name}`, this.exportConfig.context);

      // Write the project to file
      const composableStudioFilePath = pResolve(this.composableStudioPath, this.composableStudioConfig.fileName);
      log.debug(`Writing Studio project to: ${composableStudioFilePath}`, this.exportConfig.context);

      fsUtil.writeFile(composableStudioFilePath, this.composableStudioProject as unknown as Record<string, unknown>);

      log.success(
        messageHandler.parse('COMPOSABLE_STUDIO_EXPORT_COMPLETE', this.composableStudioProject.name),
        this.exportConfig.context,
      );
    } catch (error: any) {
      log.debug('Error occurred while exporting Studio project', this.exportConfig.context);
      handleAndLogError(error, {
        ...this.exportConfig.context,
      });
    }
  }
}
