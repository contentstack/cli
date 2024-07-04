jest.mock('axios');

/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios';
/* eslint-enable @typescript-eslint/no-unused-vars */

import ContentstackClient, { CreateStackOptions } from '../src/seed/contentstack/client';
import * as config from './config.json';

const CMA_HOST = 'cs.api.com';
const BASE_URL = `https://${CMA_HOST}/v3/`;
const API_KEY = config.API_KEY;
const ORG_UID = 'org_12345';
const STACK_UID = 'stack_12345';
const ORG_NAME = 'org_name_12345';
const STACK_NAME = 'stack_name_12345';
const MASTER_LOCALE = 'en-us';

// @ts-ignore
axios = {
  name: axios.name,
  create: jest.fn().mockReturnValue({ get: jest.fn(), post: jest.fn(), defaults: { baseURL: BASE_URL } }),
};

describe('ContentstackClient', () => {
  test('should create client', () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    expect(client.instance.defaults.baseURL).toBe(`https://${CMA_HOST}/v3/`);
  });

  test('should get Organizations', async () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    const getMock = jest.spyOn(client.instance, 'get');

    const input = [{ uid: ORG_UID, name: ORG_NAME, enabled: true }];

    // @ts-ignore
    getMock.mockReturnValue({ data: { organizations: input } });

    const organizations = await client.getOrganizations();

    expect(getMock).toBeCalledWith('/organizations', { params: { asc: 'name' } });
    expect(organizations).toStrictEqual(input);
  });

  test('should get Stacks', async () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    const getMock = jest.spyOn(client.instance, 'get');
    const input = [
      { uid: STACK_UID, api_key: API_KEY, org_uid: ORG_UID, name: STACK_NAME, master_locale: MASTER_LOCALE },
    ];

    // @ts-ignore
    getMock.mockReturnValue({ data: { stacks: input } });

    const stacks = await client.getStacks(ORG_UID);

    expect(getMock).toBeCalledWith('/stacks', { params: { organization_uid: ORG_UID } });
    expect(stacks).toStrictEqual(input);
  });

  test('should get Content Type count', async () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    const getMock = jest.spyOn(client.instance, 'get');

    // @ts-ignore
    getMock.mockReturnValue({ data: { count: 2 } });

    const count = await client.getContentTypeCount(API_KEY);

    expect(getMock).toBeCalledWith('/content_types', { params: { api_key: API_KEY, include_count: true } });
    expect(count).toBe(2);
  });

  test('should create Stack', async () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    const getMock = jest.spyOn(client.instance, 'post');

    const options = {
      description: 'description 12345',
      master_locale: MASTER_LOCALE,
      name: STACK_NAME,
      org_uid: ORG_UID,
    } as CreateStackOptions;

    const body = {
      stack: {
        name: options.name,
        description: options.description,
        master_locale: options.master_locale,
      },
    };

    const params = {
      headers: {
        'Content-Type': 'application/json',
        organization_uid: options.org_uid,
      },
    };

    const stack = {
      uid: STACK_UID,
      api_key: API_KEY,
      master_locale: options.master_locale,
      name: options.name,
      org_uid: ORG_UID,
    };

    // @ts-ignore
    getMock.mockReturnValue({ data: { stack: stack } });

    const result = await client.createStack(options);
    expect(getMock).toBeCalledWith('/stacks', body, params);
    expect(result).toStrictEqual(stack);
  });

  test('should test error condition', async () => {
    const client = new ContentstackClient(CMA_HOST, CMA_AUTH_TOKEN);
    const getMock = jest.spyOn(client.instance, 'get');

    // @ts-ignore
    getMock.mockRejectedValue({ response: { status: 500, data: { error_message: 'error occurred' } } });

    await expect(client.getContentTypeCount(API_KEY)).rejects.toThrow('error occurred');
  });
});
