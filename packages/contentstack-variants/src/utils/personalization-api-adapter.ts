import { HttpClient } from '@contentstack/cli-utilities';

import { AdapterHelper } from './adapter-helper';
import {
  ProjectStruct,
  Personalization,
  AttributeStruct,
  GetProjectsParams,
  CreateProjectInput,
  CreateAttributeInput,
} from '../types';

export class PersonalizationAdapter<T> extends AdapterHelper<T, HttpClient> implements Personalization<T> {
  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {}

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
    return (await this.apiClient.post<ProjectStruct>('/attributes', attribute)).data;
  }
}
