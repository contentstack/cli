const axios = require('axios');
import { AxiosInstance } from 'axios';
import ContentstackError from './error';

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

export interface CreateStackOptions {
  name: string;
  description: string;
  master_locale: string;
  org_uid: string;
}

export default class ContentstackClient {
  instance: AxiosInstance;

  limit: number;

  constructor(cmaHost: string, authToken: string, limit: number) {
    this.instance = axios.create({
      baseURL: `https://${cmaHost}/v3/`,
      headers: {
        authtoken: authToken,
      },
    });
    this.limit = limit || 100;
  }

  async getOrganization(org_uid: string): Promise<Organization> {
    try {
      const response = await this.instance.get(`/organizations/${org_uid}`);
      const o = response.data.organization;
      return {
        uid: o.uid,
        name: o.name,
        enabled: o.enabled,
      } as Organization;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await this.instance.get('/organizations', {
        params: {
          asc: 'name',
          limit: this.limit,
        },
      });

      return response.data.organizations.map((o: any) => {
        return {
          uid: o.uid,
          name: o.name,
          enabled: o.enabled,
        };
      }) as Organization[];
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getStack(stackUID: string): Promise<Stack> {
    try {
      const response = await this.instance.get('/stacks', {
        headers: { api_key: stackUID },
      });
      const s = response.data.stack;
      return {
        uid: s.uid,
        name: s.name,
        master_locale: s.master_locale,
        api_key: s.api_key,
        org_uid: s.org_uid,
      } as Stack;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getStacks(org_uid: string): Promise<Stack[]> {
    try {
      const response = await this.instance.get('/stacks', {
        params: {
          organization_uid: org_uid,
        },
      });

      return response.data.stacks.map((s: any) => {
        return {
          uid: s.uid,
          name: s.name,
          master_locale: s.master_locale,
          api_key: s.api_key,
          org_uid: s.org_uid,
        };
      }) as Stack[];
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async getContentTypeCount(api_key: string): Promise<number> {
    try {
      const response = await this.instance.get('/content_types', {
        params: {
          api_key: api_key,
          include_count: true,
        },
        headers: { api_key },
      });
      return response.data.count as number;
    } catch (error) {
      throw this.buildError(error);
    }
  }

  async createStack(options: CreateStackOptions): Promise<Stack> {
    try {
      const body = {
        stack: {
          name: options.name,
          description: options.description,
          master_locale: options.master_locale,
        },
      };

      const response = await this.instance.post('/stacks', body, {
        headers: {
          'Content-Type': 'application/json',
          organization_uid: options.org_uid,
        },
      });

      const stack = response.data.stack;

      return {
        uid: stack.uid,
        api_key: stack.api_key,
        master_locale: stack.master_locale,
        name: stack.name,
        org_uid: stack.org_uid,
      };
    } catch (error) {
      throw this.buildError(error);
    }
  }

  private buildError(error: any) {
    const message = error.response.data?.error_message || error.response.statusText;
    const status = error.response.status;
    return new ContentstackError(message, status);
  }
}
