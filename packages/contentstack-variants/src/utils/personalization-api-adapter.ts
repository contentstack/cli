import { AdapterHelper } from './adapter-helper';
import { CreateProjectInput, GetProjectsParams, LogType, Personalization, ProjectStruct } from '../types';

export class PersonalizationAdapter<T> extends AdapterHelper<T> implements Personalization<T> {
  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {}

  async createProject(input: CreateProjectInput): Promise<ProjectStruct | void> {
    return (await this.apiClient.get<ProjectStruct>('/projects', input)).data;
  }
}
