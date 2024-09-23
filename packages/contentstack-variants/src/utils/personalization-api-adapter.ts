import { AdapterHelper } from './adapter-helper';
import { HttpClient } from '@contentstack/cli-utilities';

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
} from '../types';
import { formatErrors } from './error-helper';

export class PersonalizationAdapter<T> extends AdapterHelper<T, HttpClient> implements Personalization<T> {
  constructor(options: APIConfig) {
    super(options);
  }

  async projects(options: GetProjectsParams): Promise<ProjectStruct[]> {
    const getProjectEndPoint = `/projects?connectedStackApiKey=${options.connectedStackApiKey}`;
    const data = await this.apiClient.get(getProjectEndPoint);
    return this.handleVariantAPIRes(data) as ProjectStruct[];
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
    const data = await this.apiClient.post<ProjectStruct>('/projects', project);
    return this.handleVariantAPIRes(data) as ProjectStruct;
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
    const data = await this.apiClient.post<AttributeStruct>('/attributes', attribute);
    return this.handleVariantAPIRes(data) as AttributeStruct;
  }

  async getExperiences(): Promise<ExperienceStruct[]> {
    const getExperiencesEndPoint = `/experiences`;
    const data = await this.apiClient.get(getExperiencesEndPoint);
    return this.handleVariantAPIRes(data) as ExperienceStruct[];
  }

  async getExperience(experienceUid: string): Promise<ExperienceStruct | void> {
    const getExperiencesEndPoint = `/experiences/${experienceUid}`;
    const data = await this.apiClient.get(getExperiencesEndPoint);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
  }

  async getExperienceVersions(experienceUid: string): Promise<ExperienceStruct | void> {
    const getExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions`;
    const data = await this.apiClient.get(getExperiencesVersionsEndPoint);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
  }

  async createExperienceVersion(
    experienceUid: string,
    input: CreateExperienceVersionInput,
  ): Promise<ExperienceStruct | void> {
    const createExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions`;
    const data = await this.apiClient.post(createExperiencesVersionsEndPoint, input);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
  }

  async updateExperienceVersion(
    experienceUid: string,
    versionId: string,
    input: CreateExperienceVersionInput,
  ): Promise<ExperienceStruct | void> {
    // loop through input and remove shortId from variant
    if (input?.variants) {
      input.variants = input.variants.map(({ shortUid, ...rest }) => rest);
    }
    const updateExperiencesVersionsEndPoint = `/experiences/${experienceUid}/versions/${versionId}`;
    const data = await this.apiClient.put(updateExperiencesVersionsEndPoint, input);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
  }

  async getVariantGroup(input: GetVariantGroupInput): Promise<VariantGroupStruct | void> {
    if (this.cmaAPIClient) {
      const getVariantGroupEndPoint = `/variant_groups`;
      const data = await this.cmaAPIClient
        .queryParams({ experience_uid: input.experienceUid })
        .get(getVariantGroupEndPoint);
      return this.handleVariantAPIRes(data) as VariantGroupStruct;
    }
  }

  async updateVariantGroup(input: VariantGroup): Promise<VariantGroup | void> {
    if (this.cmaAPIClient) {
      const updateVariantGroupEndPoint = `/variant_groups/${input.uid}`;
      const data = await this.cmaAPIClient.put(updateVariantGroupEndPoint, input);
      return this.handleVariantAPIRes(data) as VariantGroup;
    }
  }

  async getEvents(): Promise<EventStruct[] | void> {
    const data = await this.apiClient.get<EventStruct>('/events');
    return this.handleVariantAPIRes(data) as EventStruct[];
  }

  async createEvents(event: CreateEventInput): Promise<void | EventStruct> {
    const data = await this.apiClient.post<EventStruct>('/events', event);
    return this.handleVariantAPIRes(data) as EventStruct;
  }

  async getAudiences(): Promise<AudienceStruct[] | void> {
    const data = await this.apiClient.get<AudienceStruct>('/audiences');
    return this.handleVariantAPIRes(data) as AudienceStruct[];
  }

  async getAttributes(): Promise<AttributeStruct[] | void> {
    const data = await this.apiClient.get<AttributeStruct>('/attributes');
    return this.handleVariantAPIRes(data) as AttributeStruct[];
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
    const data = await this.apiClient.post<AudienceStruct>('/audiences', audience);
    return this.handleVariantAPIRes(data) as AudienceStruct;
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
    const data = await this.apiClient.post<ExperienceStruct>('/experiences', experience);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
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
    const updateCTInExpEndPoint = `/experiences/${experienceUid}/cms-integration/variant-group`;
    const data = await this.apiClient.post<CMSExperienceStruct>(updateCTInExpEndPoint, experience);
    return this.handleVariantAPIRes(data) as CMSExperienceStruct;
  }

  /**
   * @param {UpdateExperienceInput} experienceUid - The `experienceUid` parameter in the `getCTsFromExperience` function is
   * of type `string`. This parameter likely contains the necessary data or information
   * needed to fetch CT details related to experience.
   */
  async getCTsFromExperience(experienceUid: string): Promise<void | CMSExperienceStruct> {
    const getCTFromExpEndPoint = `/experiences/${experienceUid}/cms-integration/variant-group`;
    const data = await this.apiClient.get<CMSExperienceStruct>(getCTFromExpEndPoint);
    return this.handleVariantAPIRes(data) as CMSExperienceStruct;
  }

  /**
   * Handles the API response for variant requests.
   * @param res - The API response object.
   * @returns The variant API response data.
   * @throws If the API response status is not within the success range, an error message is thrown.
   */
  handleVariantAPIRes(res: APIResponse): VariantAPIRes {
    const { status, data } = res;

    if (status >= 200 && status < 300) {
      return data;
    }
    
    const errorMsg = data?.errors
      ? formatErrors(data.errors)
      : data?.error || data?.error_message || data?.message || 'Something went wrong while processing variant entries request!';

    throw errorMsg;
  }
}
