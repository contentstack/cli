import { HttpClient } from '@contentstack/cli-utilities';

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

export type EventsStruct = {
  _id: string;
  uid: string;
  key: string;
  name: string;
  description: string;
  project: string;
} & AnyProperty;

export type AudiencesStruct = {
  _id: string;
  uid: string;
  definition: object;
  name: string;
  description: string;
  project: string;
} & AnyProperty;

export type AttributesStruct = {
  _id: string;
  uid: string;
  name: string;
  key: string;
  description: string;
  project: string;
} & AnyProperty;

export interface Personalization<T> extends AdapterHelperInterface<T, HttpClient> {
  projects(options: GetProjectsParams): Promise<ProjectStruct[] | void>;

  createProject(input: CreateProjectInput): Promise<ProjectStruct | void>;

  getEvents(): Promise<EventsStruct[] | void>;

  getAudiences(): Promise<AudiencesStruct[] | void>;

  getAttributes(): Promise<AttributesStruct[] | void>;
}
