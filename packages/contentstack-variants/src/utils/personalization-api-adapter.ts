import { AdapterHelper } from './adapter-helper';
import { CreateProjectInput, GetProjectsParams, Personalization, ProjectStruct } from '../types';

export class PersonalizationAdapter extends AdapterHelper implements Personalization {
  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {}

  async createProject(input: CreateProjectInput): Promise<ProjectStruct | void> {}
}
