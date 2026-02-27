/**
 * Linked workspace from CMA branch settings (am_v2.linked_workspaces).
 * Consumed by export/import after fetching branch with include_settings: true.
 */
export type LinkedWorkspace = {
  uid: string;
  space_uid: string;
  is_default: boolean;
};

/**
 * Space details from GET /api/spaces/{space_uid}.
 */
export type Space = {
  uid: string;
  title?: string;
  description?: string;
  org_uid?: string;
  owner_uid?: string;
  default_locale?: string;
  default_workspace?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  meta_info?: {
    assets_count?: number;
    folders_count?: number;
    storage?: number;
    last_modified_at?: string;
  };
};

/** Response shape of GET /api/spaces/{space_uid}. */
export type SpaceResponse = { space: Space };

/**
 * Field structure from GET /api/fields (org-level).
 */
export type FieldStruct = {
  uid: string;
  title?: string;
  description?: string | null;
  display_type?: string;
  is_system?: boolean;
  is_multiple?: boolean;
  is_mandatory?: boolean;
  asset_types_count?: number;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
};

/** Response shape of GET /api/fields. */
export type FieldsResponse = {
  count: number;
  relation: string;
  fields: FieldStruct[];
};

/**
 * Options object for asset type (from GET /api/asset_types).
 */
export type AssetTypeOptions = {
  title?: string;
  publishable?: boolean;
  is_page?: boolean;
  singleton?: boolean;
  sub_title?: string[];
  url_pattern?: string;
  url_prefix?: string;
};

/**
 * Asset type structure from GET /api/asset_types (org-level).
 */
export type AssetTypeStruct = {
  uid: string;
  title?: string;
  is_system?: boolean;
  fields?: string[];
  options?: AssetTypeOptions;
  description?: string;
  content_type?: string;
  file_extension?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  category?: string;
  preview_image_url?: string;
  category_detail?: string;
};

/** Response shape of GET /api/asset_types. */
export type AssetTypesResponse = {
  count: number;
  relation: string;
  asset_types: AssetTypeStruct[];
};

/**
 * Configuration for AssetManagementAdapter constructor.
 */
export type AssetManagementAPIConfig = {
  baseURL: string;
  headers?: Record<string, string>;
  /** Optional context for logging (e.g. exportConfig.context) */
  context?: Record<string, unknown>;
};

/**
 * Adapter interface for Asset Management API calls.
 * Used by export and (future) import.
 */
export interface IAssetManagementAdapter {
  init(): Promise<void>;
  getSpace(spaceUid: string): Promise<SpaceResponse>;
  getWorkspaceFields(spaceUid: string): Promise<FieldsResponse>;
  getWorkspaceAssets(spaceUid: string): Promise<unknown>;
  getWorkspaceFolders(spaceUid: string): Promise<unknown>;
  getWorkspaceAssetTypes(spaceUid: string): Promise<AssetTypesResponse>;
}

/**
 * Options for exporting space structure (used by export app after fetching linked workspaces).
 */
export type AssetManagementExportOptions = {
  linkedWorkspaces: LinkedWorkspace[];
  exportDir: string;
  branchName: string;
  assetManagementUrl: string;
  org_uid: string;
  context?: Record<string, unknown>;
  /** When true, the AM package will add authtoken to asset download URLs. */
  securedAssets?: boolean;
};
