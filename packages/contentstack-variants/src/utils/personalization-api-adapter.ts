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
  APIResponse
} from '../types';

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

  async getVariantGroup(input: GetVariantGroupInput): Promise<ExperienceStruct | void> {
    const getVariantGroupEndPoint = `/experiences/${input.experienceUid}`;
    const data = await this.apiClient.get(getVariantGroupEndPoint);
    return this.handleVariantAPIRes(data) as ExperienceStruct;
  }

  async updateVariantGroup(input: unknown): Promise<ProjectStruct | void> {}

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

    let errorMsg: string;
    if(data){
      if (data?.errors && Object.keys(data.errors).length > 0) {
        errorMsg = this.formatErrors(data.errors);
      } else if (data?.error_message) {
        errorMsg = data.error_message;
      } else if (data?.message) {
        errorMsg = data.message;
      } else {
        errorMsg = data;
      }
    }else{
      errorMsg = 'Something went wrong while processing your request!';
    }

    throw errorMsg;
  }

  /**
   * Formats the errors into a single string.
   * @param errors - The errors to be formatted.
   * @returns The formatted errors as a string.
   */
  formatErrors(errors: any): string {
    const errorMessages: string[] = [];
  
    for (const errorKey in errors) {
      const errorValue = errors[errorKey];
      if (Array.isArray(errorValue)) {
        errorMessages.push(...errorValue.map((error: any) => this.formatError(error)));
      } else {
        errorMessages.push(this.formatError(errorValue));
      }
    }
  
    return errorMessages.join(' ');
  }
  
  formatError(error: any): string {
    if (typeof error === 'object') {
      return Object.values(error).join(' ');
    }
    return String(error);
  }
}
