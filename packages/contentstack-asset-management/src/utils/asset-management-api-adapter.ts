import { HttpClient, log, authenticationHandler } from '@contentstack/cli-utilities';

import type {
  AssetManagementAPIConfig,
  AssetTypesResponse,
  FieldsResponse,
  IAssetManagementAdapter,
  SpaceResponse,
} from '../types/asset-management-api';

export class AssetManagementAdapter implements IAssetManagementAdapter {
  private readonly config: AssetManagementAPIConfig;
  private readonly apiClient: HttpClient;

  constructor(config: AssetManagementAPIConfig) {
    this.config = config;
    this.apiClient = new HttpClient();
    const baseURL = config.baseURL?.replace(/\/$/, '') ?? '';
    this.apiClient.baseUrl(baseURL);
    const defaultHeaders = { Accept: 'application/json', 'x-cs-api-version': '4' };
    this.apiClient.headers(config.headers ? { ...defaultHeaders, ...config.headers } : defaultHeaders);
    log.debug('AssetManagementAdapter initialized', config.context);
  }

  /**
   * Build query string from params. Supports string and string[] values.
   * Returns empty string when params are empty so we never append "?" with no keys.
   */
  private buildQueryString(params: Record<string, string | string[]>): string {
    const entries = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && (typeof v === 'string' || Array.isArray(v)),
    );
    if (entries.length === 0) return '';
    const parts: string[] = [];
    for (const [key, value] of entries) {
      if (Array.isArray(value)) {
        for (const v of value) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
        }
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return '?' + parts.join('&');
  }

  /**
   * GET a space-level endpoint (e.g. /api/spaces/{uid}). Builds path + query string and performs the request.
   */
  private async getSpaceLevel<T = unknown>(
    _spaceUid: string,
    path: string,
    queryParams: Record<string, unknown> = {},
  ): Promise<T> {
    await this.init();
    const safeParams: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(queryParams)) {
      let value: string | string[] | undefined;
      if (typeof v === 'string') value = v;
      else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) value = v;
      else value = undefined;
      if (value !== undefined) safeParams[k] = value;
    }
    const queryString = this.buildQueryString(safeParams);
    const fullPath = path + queryString;
    log.debug(`GET ${fullPath}`, this.config.context);
    const response = await this.apiClient.get<T>(fullPath);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Asset Management API error: status ${response.status}, path ${path}`);
    }
    return response.data as T;
  }

  async init(): Promise<void> {
    try {
      log.debug('Initializing Asset Management adapter...', this.config.context);
      await authenticationHandler.getAuthDetails();
      const token = authenticationHandler.accessToken;
      log.debug(
        `Authentication type: ${authenticationHandler.isOauthEnabled ? 'OAuth' : 'Token'}`,
        this.config.context,
      );
      const authHeader = authenticationHandler.isOauthEnabled ? { authorization: token } : { access_token: token };
      this.apiClient.headers(this.config.headers ? { ...authHeader, ...this.config.headers } : authHeader);
      log.debug('Asset Management adapter initialization completed', this.config.context);
    } catch (error: unknown) {
      log.debug(`Asset Management adapter initialization failed: ${error}`, this.config.context);
      throw error;
    }
  }

  async getSpace(spaceUid: string): Promise<SpaceResponse> {
    log.debug(`Fetching space: ${spaceUid}`, this.config.context);
    const path = `/api/spaces/${spaceUid}`;
    const queryParams: Record<string, unknown> = {
      addl_fields: ['meta_info', 'users'],
    };
    const result = await this.getSpaceLevel<SpaceResponse>(spaceUid, path, queryParams);
    log.debug(`Fetched space: ${spaceUid}`, this.config.context);
    return result;
  }

  async getWorkspaceFields(spaceUid: string): Promise<FieldsResponse> {
    log.debug(`Fetching fields for space: ${spaceUid}`, this.config.context);
    const result = await this.getSpaceLevel<FieldsResponse>(spaceUid, '/api/fields', {});
    log.debug(`Fetched fields (count: ${result?.count ?? '?'})`, this.config.context);
    return result;
  }

  /**
   * GET a workspace collection (assets or folders), log count, and return result.
   */
  private async getWorkspaceCollection(
    spaceUid: string,
    path: string,
    logLabel: string,
  ): Promise<unknown> {
    log.debug(`Fetching ${logLabel} for space: ${spaceUid}`, this.config.context);
    const result = await this.getSpaceLevel<unknown>(spaceUid, path, {});
    const count = (result as { count?: number })?.count ?? (Array.isArray(result) ? result.length : '?');
    log.debug(`Fetched ${logLabel} (count: ${count})`, this.config.context);
    return result;
  }

  async getWorkspaceAssets(spaceUid: string): Promise<unknown> {
    return this.getWorkspaceCollection(
      spaceUid,
      `/api/spaces/${encodeURIComponent(spaceUid)}/assets`,
      'assets',
    );
  }

  async getWorkspaceFolders(spaceUid: string): Promise<unknown> {
    return this.getWorkspaceCollection(
      spaceUid,
      `/api/spaces/${encodeURIComponent(spaceUid)}/folders`,
      'folders',
    );
  }

  async getWorkspaceAssetTypes(spaceUid: string): Promise<AssetTypesResponse> {
    log.debug(`Fetching asset types for space: ${spaceUid}`, this.config.context);
    const result = await this.getSpaceLevel<AssetTypesResponse>(spaceUid, '/api/asset_types', {
      include_fields: 'true',
    });
    log.debug(`Fetched asset types (count: ${result?.count ?? '?'})`, this.config.context);
    return result;
  }
}
