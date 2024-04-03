import { HttpClient } from '@contentstack/cli-utilities';

import { AdapterHelper } from './adapter-helper';
import {
  CreateProjectInput,
  GetProjectsParams,
  Personalization,
  ProjectStruct,
  EventsStruct,
  AudiencesStruct,
  AttributesStruct,
} from '../types';

export class PersonalizationAdapter<T> extends AdapterHelper<T, HttpClient> implements Personalization<T> {
  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {}

  async createProject(input: CreateProjectInput): Promise<ProjectStruct | void> {
    return (await this.apiClient.get<ProjectStruct>('/projects', input)).data;
  }

  async getEvents(): Promise<EventsStruct[] | void> {
    return (await this.apiClient.get<EventsStruct>('/events')).data;
  }

  async getAudiences(): Promise<AudiencesStruct[] | void> {
    return (await this.apiClient.get<AudiencesStruct>('/audiences')).data;
  }

  async getAttributes(): Promise<AttributesStruct[] | void> {
    return (await this.apiClient.get<AttributesStruct>('/attributes')).data;
  }
}
