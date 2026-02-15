/**
 * Re-export of @contentstack/management types for CLI consumers.
 * Import these from @contentstack/cli-utilities instead of @contentstack/management.
 */
export type { Stack as ManagementStack } from '@contentstack/management/types/stack';
export type { AssetData } from '@contentstack/management/types/stack/asset';
export type { LocaleData } from '@contentstack/management/types/stack/locale';
export type { PublishConfig } from '@contentstack/management/types/utility/publish';
export type { FolderData } from '@contentstack/management/types/stack/asset/folder';
export type { ExtensionData } from '@contentstack/management/types/stack/extension';
export type { EnvironmentData } from '@contentstack/management/types/stack/environment';
export type { LabelData } from '@contentstack/management/types/stack/label';
export type { WebhookData } from '@contentstack/management/types/stack/webhook';
export type { WorkflowData } from '@contentstack/management/types/stack/workflow';
export type { RoleData } from '@contentstack/management/types/stack/role';
export type { GlobalFieldData, GlobalField } from '@contentstack/management/types/stack/globalField';
