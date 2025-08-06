import { AdapterHelper } from './adapter-helper';
import { HttpClient, authenticationHandler, log, CLIProgressManager, configHandler } from '@contentstack/cli-utilities';

import {
  ProjectStruct,
  Personalization,
  GetProjectsParams,
  CreateProjectInput,
  CreateAttributeInput,
  APIConfig,
  GetVariantGroupInput,
  EventStruct,
  AudienceStruct,
  AttributeStruct,
  CreateAudienceInput,
  CreateEventInput,
  CreateExperienceInput,
  ExperienceStruct,
  UpdateExperienceInput,
  CMSExperienceStruct,
  VariantAPIRes,
  APIResponse,
  VariantGroupStruct,
  VariantGroup,
  CreateExperienceVersionInput,
  ExportConfig,
} from '../types';
import { formatErrors } from './error-helper';

export class PersonalizationAdapter<T> extends AdapterHelper<T, HttpClient> implements Personalization<T> {
  public exportConfig?: ExportConfig; // Add exportConfig property to access context
  protected progressManager: CLIProgressManager | null = null;
  protected parentProgressManager: CLIProgressManager | null = null; // Add parent progress manager
  protected currentModuleName: string = '';
  protected cachedData: any[] | null = null; // Add cached data property

  constructor(options: APIConfig) {
    super(options);
    log.debug('PersonalizationAdapter initialized', this.exportConfig?.context);
  }

  /**
   * Set parent progress manager for sub-module integration
   */
  public setParentProgressManager(parentProgress: CLIProgressManager): void {
    this.parentProgressManager = parentProgress;
  }

  /**
   * Set cached data to avoid redundant API calls
   */
  public setCachedData(data: any[]): void {
    this.cachedData = data;
    log.debug(`Cached data set with ${data?.length || 0} items`, this.exportConfig?.context);
  }

  /**
   * Create simple progress manager for single process tracking
   */
  protected createSimpleProgress(moduleName: string, total?: number): CLIProgressManager {
    this.currentModuleName = moduleName;

    // If we have a parent progress manager, use it instead of creating a new one
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.progressManager;
    }

    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createSimple(moduleName, total, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Create nested progress manager for multi-process tracking
   */
  protected createNestedProgress(moduleName: string): CLIProgressManager {
    this.currentModuleName = moduleName;

    // If we have a parent progress manager, use it instead of creating a new one
    if (this.parentProgressManager) {
      this.progressManager = this.parentProgressManager;
      return this.progressManager;
    }

    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;
    this.progressManager = CLIProgressManager.createNested(moduleName, showConsoleLogs);
    return this.progressManager;
  }

  /**
   * Complete progress manager
   */
  protected completeProgress(success: boolean = true, error?: string): void {
    // Only complete progress if we own the progress manager (no parent)
    if (!this.parentProgressManager) {
      this.progressManager?.complete(success, error);
    }
    this.progressManager = null;
  }

  /**
   * Execute action with loading spinner for initial setup tasks
   */
  protected async withLoadingSpinner<T>(message: string, action: () => Promise<T>): Promise<T> {
    const logConfig = configHandler.get('log') || {};
    const showConsoleLogs = logConfig.showConsoleLogs ?? false;

    if (showConsoleLogs) {
      // If console logs are enabled, don't show spinner, just execute the action
      return await action();
    }
    return await CLIProgressManager.withLoadingSpinner(message, action);
  }

  /**
   * Update progress for a specific item
   */
  protected updateProgress(success: boolean, itemName: string, error?: string, processName?: string): void {
    this.progressManager?.tick(success, itemName, error, processName);
  }

  static printFinalSummary(): void {
    CLIProgressManager.printGlobalSummary();
  }

  async init(): Promise<void> {
    log.debug('Initializing personalization adapter...', this.exportConfig?.context);
    await authenticationHandler.getAuthDetails();
    const token = authenticationHandler.accessToken;
    log.debug(
      `Authentication type: ${authenticationHandler.isOauthEnabled ? 'OAuth' : 'Token'}`,
      this.exportConfig?.context,
    );

    if (authenticationHandler.isOauthEnabled) {
      log.debug('Setting OAuth authorization header', this.exportConfig?.context);
      this.apiClient.headers({ authorization: token });
      if (this.adapterConfig.cmaConfig) {
        log.debug('Setting OAuth authorization header for CMA client', this.exportConfig?.context);
        this.cmaAPIClient?.headers({ authorization: token });
      }
    } else {
      log.debug('Setting authtoken header', this.exportConfig?.context);
      this.apiClient.headers({ authtoken: token });
      if (this.adapterConfig.cmaConfig) {
        log.debug('Setting authtoken header for CMA client', this.exportConfig?.context);
        this.cmaAPIClient?.headers({ authtoken: token });
      }
    }
    log.debug('Personalization adapter initialization completed', this.exportConfig?.context);
  }

  async projects(options: GetProjectsParams): Promise<ProjectStruct[]> {
    await this.init();
    const getProjectEndPoint = `/projects?connectedStackApiKey=${options.connectedStackApiKey}`;
    log.debug(`Making API call to: ${getProjectEndPoint}`, this.exportConfig?.context);

    try {
      const data = await this.apiClient.get(getProjectEndPoint);
      const result = (await this.handleVariantAPIRes(data)) as ProjectStruct[];
      log.debug(`Fetched ${result?.length || 0} projects`, this.exportConfig?.context);

      // Update progress for each project fetched
      result?.forEach((project) => {
        this.updateProgress(true, `project: ${project.name || project.uid}`, undefined, 'Projects');
      });

      return result;
    } catch (error: any) {
      this.updateProgress(false, 'projects fetch', error?.message || 'Failed to fetch projects', 'Projects');
      throw error;
    }
  }

  /**
   * This TypeScript function creates a project by making an asynchronous API call to retrieve project
   * data.
   * @param {CreateProjectInput} input - The `input` parameter in the `createProject` function likely
   * represents the data needed to create a new project. It could include details such as the project
   * name, description, owner, deadline, or any other relevant information required to set up a new
   * project.
   * @returns The `createProject` function is returning a Promise that resolves to either a
   * `ProjectStruct` object or `void`.
   */
  async createProject(project: CreateProjectInput): Promise<ProjectStruct> {
    log.debug(`Creating project: ${project.name}`, this.exportConfig?.context);
    const data = await this.apiClient.post<ProjectStruct>('/projects', project);
    const result = (await this.handleVariantAPIRes(data)) as ProjectStruct;
    log.debug(`Project created successfully: ${result.uid}`, this.exportConfig?.context);
    return result;
  }

  /**
   * The function `createAttribute` asynchronously retrieves attribute data from an API endpoint.
   * @param {CreateAttributeInput} input - The `input` parameter in the `createAttribute` function is
   * of type `CreateAttributeInput`. This parameter likely contains the necessary data or information
   * needed to create a new attribute.
   * @returns The `createAttribute` function is returning the data obtained from a GET request to the
   * `/attributes` endpoint using the `apiClient` with the input provided. The data returned is of type
   * `ProjectStruct`.
   */
  async createAttribute(attribute: CreateAttributeInput): Promise<AttributeStruct> {
    log.debug(`Creating attribute: ${attribute.name}`, this.exportConfig?.context);
    const data = await this.apiClient.post<AttributeStruct>('/attributes', attribute);
    const result = (await this.handleVariantAPIRes(data)) as AttributeStruct;
    log.debug(`Attribute created successfully: ${result.uid}`, this.exportConfig?.context);
    return result;
  }

  async getExperiences(): Promise<ExperienceStruct[]> {
    log.debug('Fetching experiences from personalization API', this.exportConfig?.context);
    const getExperiencesEndPoint = `/experiences`;

    try {
      const data = await this.apiClient.get(getExperiencesEndPoint);
      const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct[];
      log.debug(`Fetched ${result?.length || 0} experiences`, this.exportConfig?.context);

      // Update progress for each experience fetched
      result?.forEach((experience) => {
        this.updateProgress(true, `experience: ${experience.name || experience.uid}`, undefined, 'Experiences');
      });

      return result;
    } catch (error: any) {
      this.updateProgress(false, 'experiences fetch', error?.message || 'Failed to fetch experiences', 'Experiences');
      throw error;
    }
  }

  async getExperience(experienceUid: string): Promise<ExperienceStruct | void> {
    log.debug(`Fetching experience: ${experienceUid}`, this.exportConfig?.context);
    const getExperiencesEndPoint = `/experiences/${experienceUid}`;
    if (this.apiClient.requestConfig?.().data) {
      delete this.apiClient.requestConfig?.().data; // explicitly prevent any accidental body
    }
    const data = await this.apiClient.get(getExperiencesEndPoint);
    const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct;
    log.debug(`Experience fetched successfully: ${result?.uid}`, this.exportConfig?.context);
    return result;
  }

  async getExperienceVersions(experienceUid: string): Promise<ExperienceStruct | void> {
    log.debug(`Fetching versions for experience: ${experienceUid}`, this.exportConfig?.context);
    const getExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions`;
    if (this.apiClient.requestConfig?.().data) {
      delete this.apiClient.requestConfig?.().data; // explicitly prevent any accidental body
    }
    const data = await this.apiClient.get(getExperiencesVersionsEndPoint);
    const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct;
    log.debug(`Experience versions fetched successfully for: ${experienceUid}`, this.exportConfig?.context);
    return result;
  }

  async createExperienceVersion(
    experienceUid: string,
    input: CreateExperienceVersionInput,
  ): Promise<ExperienceStruct | void> {
    log.debug(`Creating experience version for: ${experienceUid}`, this.exportConfig?.context);
    const createExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions`;
    const data = await this.apiClient.post(createExperiencesVersionsEndPoint, input);
    const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct;
    log.debug(`Experience version created successfully for: ${experienceUid}`, this.exportConfig?.context);
    return result;
  }

  async updateExperienceVersion(
    experienceUid: string,
    versionId: string,
    input: CreateExperienceVersionInput,
  ): Promise<ExperienceStruct | void> {
    log.debug(`Updating experience version: ${versionId} for experience: ${experienceUid}`, this.exportConfig?.context);
    // loop through input and remove shortId from variant
    if (input?.variants) {
      input.variants = input.variants.map(({ shortUid, ...rest }) => rest);
      log.debug(`Processed ${input.variants.length} variants for update`, this.exportConfig?.context);
    }
    const updateExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions/${versionId}`;
    const data = await this.apiClient.put(updateExperiencesVersionsEndPoint, input);
    const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct;
    log.debug(`Experience version updated successfully: ${versionId}`, this.exportConfig?.context);
    return result;
  }

  async getVariantGroup(input: GetVariantGroupInput): Promise<VariantGroupStruct | void> {
    log.debug(`Fetching variant group for experience: ${input.experienceUid}`, this.exportConfig?.context);
    if (this.cmaAPIClient) {
      const getVariantGroupEndPoint = `/variant_groups`;
      const data = await this.cmaAPIClient
        .queryParams({ experience_uid: input.experienceUid })
        .get(getVariantGroupEndPoint);
      const result = (await this.handleVariantAPIRes(data)) as VariantGroupStruct;
      log.debug(
        `Variant group fetched successfully for experience: ${input.experienceUid}`,
        this.exportConfig?.context,
      );
      return result;
    } else {
      log.debug('CMA API client not available for variant group fetch', this.exportConfig?.context);
    }
  }

  async updateVariantGroup(input: VariantGroup): Promise<VariantGroup | void> {
    log.debug(`Updating variant group: ${input.uid}`, this.exportConfig?.context);
    if (this.cmaAPIClient) {
      const updateVariantGroupEndPoint = `/variant_groups/${input.uid}`;
      const data = await this.cmaAPIClient.put(updateVariantGroupEndPoint, input);
      const result = (await this.handleVariantAPIRes(data)) as VariantGroup;
      log.debug(`Variant group updated successfully: ${input.uid}`, this.exportConfig?.context);
      return result;
    } else {
      log.debug('CMA API client not available for variant group update', this.exportConfig?.context);
    }
  }

  async getEvents(): Promise<EventStruct[] | void> {
    log.debug('Fetching events from personalization API', this.exportConfig?.context);
    const data = await this.apiClient.get<EventStruct>('/events');
    const result = (await this.handleVariantAPIRes(data)) as EventStruct[];
    log.debug(`Fetched ${result?.length || 0} events`, this.exportConfig?.context);
    return result;
  }

  async createEvents(event: CreateEventInput): Promise<void | EventStruct> {
    const data = await this.apiClient.post<EventStruct>('/events', event);
    const result = (await this.handleVariantAPIRes(data)) as EventStruct;
    log.debug(`Event created successfully: ${result.uid}`, this.exportConfig?.context);
    return result;
  }

  async getAudiences(): Promise<AudienceStruct[] | void> {
    log.debug('Fetching audiences from personalization API', this.exportConfig?.context);
    const data = await this.apiClient.get<AudienceStruct>('/audiences');
    const result = (await this.handleVariantAPIRes(data)) as AudienceStruct[];
    log.debug(`Fetched ${result?.length || 0} audiences`, this.exportConfig?.context);
    return result;
  }

  async getAttributes(): Promise<AttributeStruct[] | void> {
    log.debug('Fetching attributes from personalization API', this.exportConfig?.context);
    const data = await this.apiClient.get<AttributeStruct>('/attributes');
    const result = (await this.handleVariantAPIRes(data)) as AttributeStruct[];
    log.debug(`Fetched ${result?.length || 0} attributes`, this.exportConfig?.context);
    return result;
  }

  /**
   * @param {CreateAudienceInput} audience - The `audience` parameter in the `createAudience` function is
   * of type `CreateAudienceInput`. This parameter likely contains the necessary data or information
   * needed to create a new audience.
   * @returns The `createAudience` function is returning the data obtained from a GET request to the
   * `/audiences` endpoint using the `apiClient` with the input provided. The data returned is of type
   * `AudienceStruct`.
   */
  async createAudience(audience: CreateAudienceInput): Promise<void | AudienceStruct> {
    log.debug(`Creating audience: ${audience.name}`, this.exportConfig?.context);
    const data = await this.apiClient.post<AudienceStruct>('/audiences', audience);
    const result = (await this.handleVariantAPIRes(data)) as AudienceStruct;
    log.debug(`Audience created successfully: ${result.uid}`, this.exportConfig?.context);
    return result;
  }

  /**
   * @param {CreateExperienceInput} experience - The `experience` parameter in the `createExperience` function is
   * of type `CreateExperienceInput`. This parameter likely contains the necessary data or information
   * needed to create a new audience.
   * @returns The `createExperience` function is returning the data obtained from a GET request to the
   * `/experiences` endpoint using the `apiClient` with the input provided. The data returned is of type
   * `ExperienceStruct`.
   */
  async createExperience(experience: CreateExperienceInput): Promise<void | ExperienceStruct> {
    log.debug(`Creating experience: ${experience.name}`, this.exportConfig?.context);
    const data = await this.apiClient.post<ExperienceStruct>('/experiences', experience);
    const result = (await this.handleVariantAPIRes(data)) as ExperienceStruct;
    log.debug(`Experience created successfully: ${result.uid}`, this.exportConfig?.context);
    return result;
  }

  /**
   * @param {UpdateExperienceInput} experience - The `experience` parameter in the `updateCTsInExperience` function is
   * of type `UpdateExperienceInput`. This parameter likely contains the necessary data or information
   * needed to attach CT in new created experience.
   */
  async updateCTsInExperience(
    experience: UpdateExperienceInput,
    experienceUid: string,
  ): Promise<void | CMSExperienceStruct> {
    log.debug(`Updating content types in experience: ${experienceUid}`, this.exportConfig?.context);
    const updateCTInExpEndPoint = `/experiences/${experienceUid}/cms-integration/variant-group`;
    const data = await this.apiClient.post<CMSExperienceStruct>(updateCTInExpEndPoint, experience);
    const result = (await this.handleVariantAPIRes(data)) as CMSExperienceStruct;
    log.debug(`Content types updated successfully in experience: ${experienceUid}`, this.exportConfig?.context);
    return result;
  }

  /**
   * @param {UpdateExperienceInput} experienceUid - The `experienceUid` parameter in the `getCTsFromExperience` function is
   * of type `string`. This parameter likely contains the necessary data or information
   * needed to fetch CT details related to experience.
   */
  async getCTsFromExperience(experienceUid: string): Promise<void | CMSExperienceStruct> {
    log.debug(`Fetching content types from experience: ${experienceUid}`, this.exportConfig?.context);
    const getCTFromExpEndPoint = `/experiences/${experienceUid}/cms-integration/variant-group`;
    const data = await this.apiClient.get<CMSExperienceStruct>(getCTFromExpEndPoint);
    const result = (await this.handleVariantAPIRes(data)) as CMSExperienceStruct;
    log.debug(`Content types fetched successfully from experience: ${experienceUid}`, this.exportConfig?.context);
    return result;
  }

  /**
   * Handles the API response for variant requests.
   * @param res - The API response object.
   * @returns The variant API response data.
   * @throws If the API response status is not within the success range, an error message is thrown.
   */
  async handleVariantAPIRes(res: APIResponse): Promise<VariantAPIRes> {
    const { status, data } = res;
    log.debug(`API response status: ${status}`, this.exportConfig?.context);

    if (status >= 200 && status < 300) {
      log.debug('API request successful', this.exportConfig?.context);
      return data;
    }

    log.debug(`API request failed with status: ${status}`, this.exportConfig?.context);
    // Refresh the access token if it has expired
    await authenticationHandler.refreshAccessToken(res);

    const errorMsg = data?.errors
      ? formatErrors(data.errors)
      : data?.error || data?.error_message || data?.message || data;
    log.debug(`API error: ${errorMsg}`, this.exportConfig?.context);
    throw errorMsg;
  }
}
