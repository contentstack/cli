import ContentstackError from './error';
import { managementSDKClient, configHandler } from '@contentstack/cli-utilities';
import * as ContentstackManagementSDK from '@contentstack/management';

export interface Organization {
  uid: string;
  name: string;
  enabled: boolean;
}

export interface Stack {
  uid: string;
  name: string;
  master_locale: string;
  api_key: string;
  org_uid: string;
}

export interface ManagementToken {
  response_code: string;
  response_message: string;
}


export interface CreateStackOptions {
  name: string;
  description: string;
  master_locale: string;
  org_uid: string;
}

export interface createManagementTokenOptions{
  name: string;
  description: string;
  expires_on: string;
  scope: {
    module: string;
    acl: {
      read: boolean;
      write?: boolean;
    };
    branches?: string[];
  }[];
}

export default class ContentstackClient {
  instance: Promise<ContentstackManagementSDK.ContentstackClient>;

  limit: number;

  constructor(cmaHost: string, limit: number) {
    this.instance = managementSDKClient({ host: cmaHost });
    this.limit = limit || 100;
  }

  async getOrganization(org_uid: string): Promise<Organization> {
    try {
      const client = await this.instance;
      const response = await client.organization(org_uid).fetch();
      return {
        uid: response.uid,
        name: response.name,
        enabled: response.enabled,
      } as Organization;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getOrganizations(skip = 0, organizations: Organization[] = []): Promise<Organization[]> {
    try {
      const client = await this.instance;
      const configOrgUid = configHandler.get('oauthOrgUid');

      if (configOrgUid) {
        const response = await client.organization(configOrgUid).fetch();
        const mappedOrganization = this.mapOrganization(response);
        organizations.push(mappedOrganization);
      } else {
        const response = await client
          .organization()
          .fetchAll({ limit: this.limit, asc: 'name', include_count: true, skip });
        organizations.push(...response.items.map(this.mapOrganization));

        if (organizations.length < response.count) {
          organizations = await this.getOrganizations(skip + this.limit, organizations);
        }
      }

      return organizations;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  private mapOrganization(o: any): Organization {
    return {
      uid: o.uid,
      name: o.name,
      enabled: o.enabled,
    };
  }

  async getStack(stackUID: string): Promise<Stack> {
    try {
      const client = await this.instance;
      const response = await client.stack({ api_key: stackUID }).fetch();
      return {
        uid: response.uid,
        name: response.name,
        master_locale: response.master_locale,
        api_key: response.api_key,
        org_uid: response.org_uid,
      } as Stack;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getStacks(org_uid: string, skip = 0, stacks: Stack[] = []): Promise<Stack[]> {
    try {
      const client = await this.instance;
      const response = await client
        .stack({ organization_uid: org_uid })
        .query({
          limit: this.limit,
          include_count: true,
          skip: skip,
          query: {},
        })
        .find();
      stacks = stacks.concat(
        response.items.map((s: any) => {
          return {
            uid: s.uid,
            name: s.name,
            master_locale: s.master_locale,
            api_key: s.api_key,
            org_uid: s.org_uid,
          };
        }) as Stack[],
      );
      if (stacks.length < response.count) {
        stacks = await this.getStacks(org_uid, skip + this.limit, stacks);
      }
      return stacks;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getContentTypeCount(api_key: string, managementToken?: string): Promise<number> {
    try {
      const client = await this.instance;
      const response = await client
        .stack({ api_key: api_key, management_token: managementToken })
        .contentType()
        .query({ include_count: true })
        .find();
      return response.count as number;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async createStack(options: CreateStackOptions): Promise<Stack> {
    try {
      const client = await this.instance;
      const body = {
        stack: {
          name: options.name,
          description: options.description,
          master_locale: options.master_locale,
        },
      };

      const response = await client.stack().create(body, { organization_uid: options.org_uid });
      return {
        uid: response.uid,
        api_key: response.api_key,
        master_locale: response.master_locale,
        name: response.name,
        org_uid: response.org_uid,
      };
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async createManagementToken(api_key: string, managementToken: any, options: createManagementTokenOptions): Promise<ManagementToken> {
    try {
      const client = await this.instance;
      const body = {
        token: {
          name: options.name,
          description: options.description,
          scope: options.scope,
          expires_on: options.expires_on,
        },
      };

      const response = await client.stack({ api_key: api_key, management_token: managementToken }).managementToken().create(body);
      return {
        response_code: response.errorCode,
        response_message: response.errorMessage
      };
    } catch (error: unknown) {
      const typedError = error as { errorCode: string };
      
      if (typedError.errorCode === '401') {
          return {
            response_code: '401',
            response_message: 'You do not have access to create management tokens. Please try again or ask an Administrator for assistance.'
          }
      }
      throw this.buildError(typedError);
  }
  
  }

  private buildError(error: any) {
    const message = error.errorMessage || error.response.data?.errorMessage || error.response.statusText;
    const status = error.status;
    return new ContentstackError(message, status);
  }
}
