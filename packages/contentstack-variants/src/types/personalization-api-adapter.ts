import { AnyProperty } from './utils';
import { AdapterHelperInterface } from './adapter-helper';

export type ProjectStruct = {
  _id: string;
  uid: string;
  name: string;
  description: string;
  audienceCount: number;
  organizationUid: string;
  activeExperienceCount: number;
} & AnyProperty;

export type GetProjectsParams = {
  connectedStackApiKey: string;
  includeAudienceCount: boolean;
  includeActiveExperienceCount: boolean;
  callback: (value: ProjectStruct[]) => void;
} & AnyProperty;

export type CreateProjectInput = {
  name: string;
  description: string;
  connectedStackApiKey?: string;
};

export interface Personalization extends AdapterHelperInterface {
  projects(options: GetProjectsParams): Promise<ProjectStruct[] | void>;

  createProject(input: CreateProjectInput): Promise<ProjectStruct | void>;
}
