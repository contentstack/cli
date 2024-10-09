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
  includeAudienceCount?: boolean;
  includeActiveExperienceCount?: boolean;
  callback?: (value: ProjectStruct[]) => void;
} & AnyProperty;

export interface CreateProjectInput {
  name: string;
  description: string;
  connectedStackApiKey?: string;
}

export type GetVariantGroupInput = {
  experienceUid: string;
};

export type VariantGroup = {
  uid: string;
  name: string;
  content_types: string[];
  description: string;
} & AnyProperty;

export type VariantGroupStruct = {
  variant_groups: Array<VariantGroup>;
} & AnyProperty;

export type EventStruct = {
  _id: string;
  uid: string;
  key: string;
  name: string;
  description: string;
  project: string;
} & AnyProperty;

export type AudienceStruct = {
  _id: string;
  uid: string;
  definition: {
    _type: string;
    combinationType: string;
    rules: Record<string, any>[];
  };
  name: string;
  description: string;
  project: string;
} & AnyProperty;

export type AttributeStruct = {
  _id: string;
  uid: string;
  key: string;
  name: string;
  project: string;
  description: string;
} & AnyProperty;

export interface CreateAttributeInput {
  name: string;
  key: string;
  description: string;
}

export interface CreateEventInput {
  key: string;
  description: string;
}

export interface CreateAudienceInput {
  name: string;
  definition: object;
  description: string;
}

type ExpVariations = {
  name: string;
  __type: string;
  audiences?: string[];
  audienceCombinationType?: string;
  shortUid?: string;
  trafficDistribution?: string;
} & AnyProperty;

type ExpTargeting = {
  audience?: {
    audiences?: string[];
    audienceCombinationType?: string;
  } & AnyProperty;
};

export type ExpMetric = {
  event: string;
  name: string;
  __type: string;
} & AnyProperty;

export type ExperienceStruct = {
  _id: string;
  uid: string;
  name: string;
  __type: string;
  description: string;
  targeting?: ExpTargeting;
  variations: ExpVariations[];
  variationSplit?: string;
  metrics?: ExpMetric[];
  status: string;
  metadata?: object;
  _cms?: {
    variantGroup: object;
    variants: Record<string, string>;
  };
  content_types?: string[];
} & AnyProperty;

export interface CreateExperienceVersionInput {
  name: string;
  __type: string;
  description: string;
  targeting?: ExpTargeting;
  variations: ExpVariations[];
  variationSplit?: string;
  metrics?: ExpMetric[];
  status: string;
  metadata?: object;
  variants: Array<ExpVariations>;
}
export interface CreateExperienceInput {
  name: string;
  __type: string;
  description: string;
  targeting?: ExpTargeting;
  variations: ExpVariations[];
  variationSplit?: string;
  metrics?: ExpMetric[];
  status: string;
  metadata?: object;
  variants?: Array<ExpVariations>;
}

export interface UpdateExperienceInput {
  contentTypes: string[];
}

export interface CMSExperienceStruct {
  uid: string;
  contentTypes: string[];
  content_types?: string[];
}

export type VariantAPIRes =
  | ProjectStruct[]
  | ProjectStruct
  | AttributeStruct[]
  | AttributeStruct
  | ExperienceStruct[]
  | EventStruct[]
  | AudienceStruct[]
  | ExperienceStruct
  | EventStruct
  | AudienceStruct
  | CMSExperienceStruct
  | VariantGroupStruct
  | Error;

export interface APIResponse {
  status: number;
  data: any;
}

export interface Personalization<T> extends AdapterHelperInterface<T, HttpClient> {
  projects(options: GetProjectsParams): Promise<ProjectStruct[] | void>;

  createProject(project: CreateProjectInput): Promise<ProjectStruct | void>;

  getEvents(): Promise<EventStruct[] | void>;

  getAudiences(): Promise<AudienceStruct[] | void>;

  getAttributes(): Promise<AttributeStruct[] | void>;

  createAttribute(attribute: CreateAttributeInput): Promise<AttributeStruct | void>;

  createAudience(attribute: CreateAudienceInput): Promise<AudienceStruct | void>;

  createExperience(experience: CreateExperienceInput): Promise<ExperienceStruct | void>;

  getCTsFromExperience(experienceUid: string): Promise<CMSExperienceStruct | void>;

  updateCTsInExperience(experience: UpdateExperienceInput, experienceUid: string): Promise<CMSExperienceStruct | void>;

  handleVariantAPIRes(res: any): Promise<VariantAPIRes>;
}
