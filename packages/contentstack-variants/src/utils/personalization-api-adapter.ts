import { AdapterHelper } from './adapter-helper';
import { APIConfig, CreateProjectInput, GetProjectsParams, GetVariantGroupInput, Personalization, ProjectStruct } from '../types';
import { configHandler, HttpResponse } from '@contentstack/cli-utilities';

export class PersonalizationAdapter extends AdapterHelper implements Personalization {
  constructor(options: APIConfig) {
    super(options);
    const eclipseURL = options.eclipseURL?.includes('http') ? options.eclipseURL : `https://${options.eclipseURL}`;
    this.httpClient.baseUrl(eclipseURL);
  
  }

  async getProject(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[]> {
    const getProjectEndPoint = `/projects?connectedStackApiKey=${options.connectedStackApiKey}`;
   return (await this.httpClient.get(getProjectEndPoint)).data;
  }

  async projects(options: GetProjectsParams, projects: ProjectStruct[] = []): Promise<ProjectStruct[] | void> {}

  async createProject(input: CreateProjectInput): Promise<ProjectStruct | void> { }
  
  async getExperiences(): Promise<ProjectStruct | void> {
    const getExperiencesEndPoint = `/experiences`;
    return (await this.httpClient.get(getExperiencesEndPoint)).data;
  }

  async getVariantGroup(input: GetVariantGroupInput): Promise<ProjectStruct | void> {
    const getVariantGroupEndPoint = `/experiences/:${input.experienceUid}/cms-integration/variant-group`;
    return (await this.httpClient.get(getVariantGroupEndPoint)).data;
  }

  async updateVariantGroup(input: unknown): Promise<ProjectStruct | void> {}
  
}
