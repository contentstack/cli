/**
 * Type definitions for export-to-csv package.
 *
 * Uses types from @contentstack/cli-utilities where available.
 * Defines package-specific types for API responses, CSV structures, and CLI flags.
 */

// Re-export shared types from cli-utilities
export type {
  Organization,
  ContentType,
  Environment,
  Locale,
  PrintOptions,
  InquirePayload,
  ContentstackClient as ManagementClient,
} from '@contentstack/cli-utilities';

// Import ContentstackClient from cli-utilities (which re-exports from @contentstack/management)
import { ContentstackClient } from '@contentstack/cli-utilities';

// ============================================================================
// Management SDK Types
// ============================================================================

/**
 * Stack API Client - returned by managementClient.stack()
 */
export type StackClient = ReturnType<ContentstackClient['stack']>;

// ============================================================================
// CLI Flag Types
// ============================================================================

/**
 * Available export actions.
 */
export type ExportAction = 'entries' | 'users' | 'teams' | 'taxonomies';

/**
 * Parsed CLI flags for the export-to-csv command.
 */
export interface ExportToCsvFlags {
  [key: string]: unknown;
  action?: ExportAction;
  alias?: string;
  org?: string;
  'stack-name'?: string;
  'stack-api-key'?: string;
  'org-name'?: string;
  locale?: string;
  'content-type'?: string;
  branch?: string;
  'team-uid'?: string;
  'taxonomy-uid'?: string;
  'include-fallback'?: boolean;
  'fallback-locale'?: string;
  delimiter?: string;
}

/**
 * Token configuration from config handler.
 */
export interface TokenConfig {
  apiKey: string;
  token: string;
}

/**
 * Tokens map from config handler.
 */
export interface TokensMap {
  [alias: string]: TokenConfig;
}

// ============================================================================
// Stack & Branch Types
// ============================================================================

/**
 * Stack details used throughout the command.
 */
export interface StackDetails {
  name: string;
  apiKey: string;
  token?: string;
  branch_uid?: string;
}

/**
 * Branch data structure.
 */
export interface Branch {
  uid: string;
  source?: string;
  alias?: string[];
}

/**
 * Stack initialization options for SDK.
 */
export interface StackInitOptions {
  api_key: string;
  branch_uid?: string;
  management_token?: string;
}

/**
 * Branch existence check result.
 */
export interface BranchExistsResult {
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Stack item structure from API.
 */
export interface StackItem {
  name: string;
  api_key: string;
}

// ============================================================================
// Organization Types
// ============================================================================

/**
 * Organization item structure from API.
 */
export interface OrganizationItem {
  uid: string;
  name: string;
  items?: OrganizationItem[];
}

/**
 * Organization with roles structure from getUser API.
 */
export interface OrgWithRoles {
  uid: string;
  name: string;
  is_owner?: boolean;
  org_roles?: Array<{ admin?: boolean }>;
}

/**
 * Organization role map structure.
 */
export interface OrgRoleMap {
  member?: string;
  admin?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// Organization User Types
// ============================================================================

/**
 * Organization user from getInvitations API.
 */
export interface OrgUser {
  uid?: string;
  email: string;
  user_uid: string;
  org_uid?: string;
  invited_by: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
  org_roles?: string[];
}

/**
 * Organization role data.
 */
export interface OrgRole {
  uid: string;
  name: string;
  description?: string;
  admin?: boolean;
}

/**
 * Paginated response for organization users.
 */
export interface OrgUsersResponse {
  items: OrgUser[];
}

/**
 * Paginated response for organization roles.
 */
export interface OrgRolesResponse {
  items: OrgRole[];
}

/**
 * User response from getUser API.
 */
export interface UserResponse {
  organizations: Array<{
    uid: string;
    name: string;
    is_owner?: boolean;
    org_roles?: Array<{ admin?: boolean }>;
    getInvitations?: () => Promise<OrgUsersResponse>;
    roles?: () => Promise<OrgRolesResponse>;
  }>;
}

// ============================================================================
// Content Type & Entry Types
// ============================================================================

/**
 * Content type count response.
 */
export interface ContentTypeCountResponse {
  content_types: number;
}

/**
 * Content type item from API.
 */
export interface ContentTypeItem {
  uid: string;
  title?: string;
}

/**
 * Language/locale item structure from API.
 */
export interface LanguageItem {
  name: string;
  code: string;
}

/**
 * Environment item structure from API.
 */
export interface EnvironmentItem {
  uid: string;
  name: string;
}

/**
 * Entry publish details.
 */
export interface PublishDetails {
  environment: string;
  locale: string;
  time?: string;
}

/**
 * Workflow details for an entry.
 */
export interface WorkflowDetails {
  name?: string;
  uid?: string;
}

/**
 * Raw entry from API (before transformation).
 */
export interface RawEntry {
  uid: string;
  title: string;
  locale: string;
  content_type_uid?: string;
  publish_details?: PublishDetails[];
  _workflow?: WorkflowDetails;
  setWorkflowStage?: unknown;
  stackHeaders?: unknown;
  update?: unknown;
  delete?: unknown;
  fetch?: unknown;
  publish?: unknown;
  unpublish?: unknown;
  import?: unknown;
  publishRequest?: unknown;
  [key: string]: unknown;
}

/**
 * Entries query response from SDK.
 */
export interface EntriesResponse {
  items: RawEntry[];
  count?: number;
}

/**
 * Entry count response from SDK.
 */
export interface EntriesCountResponse {
  entries: number;
}

/**
 * Language/locale data with code and name.
 */
export interface LanguageChoice {
  code: string;
  name?: string;
}

// ============================================================================
// Team Types
// ============================================================================

/**
 * Stack role map with stack details.
 */
export interface StackRoleMap {
  [key: string]: string | { name: string; uid: string };
}

/**
 * Team user data.
 */
export interface TeamUser {
  [key: string]: unknown;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  orgInvitationStatus?: string;
  'team-name'?: string;
  'team-uid'?: string;
}

/**
 * Stack role mapping for teams.
 */
export interface StackRoleMapping {
  stackApiKey: string;
  roles: string[];
}

/**
 * Raw team data from API (before transformation).
 */
export interface RawTeam {
  uid: string;
  name: string;
  description?: string;
  organizationRole: string;
  users?: TeamUser[];
  stackRoleMapping?: StackRoleMapping[];
  _id?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  __v?: number;
  createdByUserName?: string;
  updatedByUserName?: string;
  organizationUid?: string;
  urlPath?: string;
  update?: unknown;
  delete?: unknown;
  fetch?: unknown;
  stackRoleMappings?: unknown;
  teamUsers?: unknown;
}

/**
 * Cleaned team data for CSV export.
 */
export interface CleanedTeam {
  uid: string;
  name: string;
  description: string;
  organizationRole: string;
  users?: TeamUser[];
  stackRoleMapping?: StackRoleMapping[];
  Total_Members: number;
}

/**
 * Teams fetch response.
 */
export interface TeamsResponse {
  items: RawTeam[];
  count?: number;
}

/**
 * Stack role data from SDK.
 */
export interface StackRole {
  uid: string;
  name: string;
  stack?: {
    api_key: string;
    name: string;
    uid: string;
  };
}

/**
 * Stack roles response.
 */
export interface StackRolesResponse {
  items: StackRole[];
}

// ============================================================================
// Taxonomy Types
// ============================================================================

/**
 * Taxonomy data structure.
 */
export interface Taxonomy {
  uid: string;
  name: string;
  description?: string;
}

/**
 * Taxonomy term data structure.
 */
export interface Term {
  uid: string;
  name: string;
  parent_uid: string | null;
  depth: number;
}

/**
 * Taxonomies query response.
 */
export interface TaxonomiesResponse {
  items: Taxonomy[];
  count: number;
}

/**
 * Terms query response.
 */
export interface TermsResponse {
  items: Term[];
  count: number;
}

/**
 * Taxonomy SDK handler payload.
 */
export interface TaxonomyPayload {
  stackAPIClient: StackClient;
  type?: 'taxonomies' | 'taxonomy' | 'terms' | 'export-taxonomies';
  taxonomyUID?: string;
  format?: string;
  locale?: string;
  branch?: string;
  include_fallback?: boolean;
  fallback_locale?: string;
  limit: number;
}

/**
 * Locale options for taxonomy export.
 */
export interface TaxonomyLocaleOptions {
  locale?: string;
  branch?: string;
  include_fallback?: boolean;
  fallback_locale?: string;
}

// ============================================================================
// CSV Row Types
// ============================================================================

/**
 * Flattened entry row for CSV export.
 */
export interface FlattenedEntryRow {
  uid: string;
  title: string;
  locale: string;
  content_type_uid: string;
  publish_details: string[];
  _workflow: string;
  ACL: string;
  [key: string]: unknown;
}

/**
 * Organization user row for CSV export.
 */
export interface OrgUserCsvRow {
  [key: string]: unknown;
  Email: string;
  'User UID': string;
  'Organization Role': string;
  Status: string;
  'Invited By': string;
  'Created Time': string;
  'Updated Time': string;
}

/**
 * Team CSV row for export.
 */
export interface TeamCsvRow {
  [key: string]: unknown;
  uid: string;
  name: string;
  description: string;
  organizationRole: string;
  Total_Members: number;
}

/**
 * Team user CSV row for export.
 */
export interface TeamUserCsvRow {
  [key: string]: unknown;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  'team-name': string;
  'team-uid': string;
}

/**
 * Stack role mapping CSV row for export.
 */
export interface StackRoleMappingCsvRow {
  [key: string]: unknown;
  'Team Name': string;
  'Team Uid': string;
  'Stack Name': string;
  'Stack Uid': string;
  'Role Name': string;
  'Role Uid': string;
}

/**
 * Taxonomy CSV row for export.
 */
export interface TaxonomyCsvRow {
  [key: string]: unknown;
  'Taxonomy UID': string;
  Name: string;
  Description: string;
}

/**
 * Term CSV row for export.
 */
export interface TermCsvRow {
  [key: string]: unknown;
  'Taxonomy UID': string;
  UID: string;
  Name: string;
  'Parent UID': string | null;
  Depth: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination parameters for API calls.
 */
export interface PaginationParams {
  skip: number;
  page: number;
  limit: number;
}

/**
 * Query parameters for taxonomy/term API calls.
 */
export interface TaxonomyQueryParams {
  include_count: boolean;
  limit: number;
  skip?: number;
  locale?: string;
  branch?: string;
  include_fallback?: boolean;
  fallback_locale?: string;
  depth?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error structure.
 */
export interface ApiError {
  errorMessage?: string;
  error_message?: string;
  message?: string;
  errors?: Record<string, string>;
}

// ============================================================================
// Mapping Types
// ============================================================================

/**
 * Map of organization names to UIDs.
 */
export type OrgMap = Record<string, string>;

/**
 * Map of stack names to API keys.
 */
export type StackMap = Record<string, string>;

/**
 * Map of content type titles to UIDs.
 */
export type ContentTypeMap = Record<string, string>;

/**
 * Map of language names to codes.
 */
export type LanguageMap = Record<string, string>;

/**
 * Map of environment UIDs to names.
 */
export type EnvironmentMap = Record<string, string>;

/**
 * Map of user UIDs to emails.
 */
export type UserMap = Record<string, string>;

/**
 * Map of role UIDs to names.
 */
export type RoleMap = Record<string, string>;

// ============================================================================
// Inquirer Prompt Types
// ============================================================================

/**
 * Organization choice result from prompt.
 */
export interface OrganizationChoice {
  name: string;
  uid: string;
}

/**
 * Stack choice result from prompt.
 */
export interface StackChoice {
  name: string;
  apiKey: string;
}

/**
 * Branch choice result from prompt.
 */
export interface BranchChoice {
  branch: string;
}

/**
 * Fallback options result from prompt.
 */
export interface FallbackOptions {
  includeFallback: boolean;
  fallbackLocale: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error with optional errorMessage and message properties.
 */
export interface ErrorWithMessage {
  errorMessage?: string;
  message?: string;
}

/**
 * Taxonomy-specific error with errors object.
 */
export interface TaxonomyError {
  errorMessage?: string;
  message?: string;
  errors?: {
    taxonomy?: string;
    term?: string;
  };
}

// ============================================================================
// CSV Types
// ============================================================================

/**
 * CSV row data type - can be any record with string keys or string array.
 */
export type CsvRow = Record<string, unknown> | string[];

// ============================================================================
// CSV Import Result Types
// ============================================================================

/**
 * Result from createImportableCSV function.
 */
export interface ImportableCsvResult {
  taxonomiesData: string[][];
  headers: string[];
}
