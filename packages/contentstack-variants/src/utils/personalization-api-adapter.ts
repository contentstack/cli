import { AdapterHelper } from './adapter-helper';
import { configHandler, HttpClient, HttpResponse } from '@contentstack/cli-utilities';

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
} from '../types';
export class PersonalizationAdapter<T> extends AdapterHelper<T, HttpClient> implements Personalization<T> {
  constructor(options: APIConfig) {
    super(options);
  }

  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {
    const getProjectEndPoint = `/projects?connectedStackApiKey=${options.connectedStackApiKey}`;
    return (await this.apiClient.get(getProjectEndPoint)).data;
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
  async createProject(project: CreateProjectInput): Promise<ProjectStruct | void> {
    return (await this.apiClient.post<ProjectStruct>('/projects', project)).data;
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
  async createAttribute(attribute: CreateAttributeInput): Promise<void | AttributeStruct> {
    return (await this.apiClient.post<AttributeStruct>('/attributes', attribute)).data;
  }

  async getExperiences(): Promise<Array<ProjectStruct> | void> {
    const getExperiencesEndPoint = `/experiences`;
    return (await this.apiClient.get(getExperiencesEndPoint)).data;
  }

  async getVariantGroup(input: GetVariantGroupInput): Promise<ProjectStruct | void> {
    const getVariantGroupEndPoint = `/experiences/:${input.experienceUid}`;
    return (await this.apiClient.get(getVariantGroupEndPoint)).data;
  }

  async updateVariantGroup(input: unknown): Promise<ProjectStruct | void> {}

  async getEvents(): Promise<EventStruct[] | void> {
    return (await this.apiClient.get<EventStruct>('/events')).data;
  }

  async createEvents(event: CreateEventInput): Promise<void | AttributeStruct> {
    return (await this.apiClient.post<AttributeStruct>('/events', event)).data;
  }

  async getAudiences(): Promise<AudienceStruct[] | void> {
    return (await this.apiClient.get<AudienceStruct>('/audiences')).data;
  }

  async getAttributes(): Promise<AttributeStruct[] | void> {
    return (await this.apiClient.get<AttributeStruct>('/attributes')).data;
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
    return (await this.apiClient.post<AudienceStruct>('/audiences', audience)).data;
  }
}
