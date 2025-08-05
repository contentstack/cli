import { ContentTypeStruct } from './content-types';

export interface ScanAndFixResult {
  missingCtRefs?: Record<string, any> | ContentTypeStruct[];
  missingGfRefs?: Record<string, any> | ContentTypeStruct[];
  missingEntryRefs?: Record<string, any>;
  missingVariantRefs?: Record<string, any>;
  missingCtRefsInExtensions?: Record<string, any>;
  missingCtRefsInWorkflow?: Record<string, any>;
  missingSelectFeild?: Record<string, any>;
  missingMandatoryFields?: Record<string, any>;
  missingTitleFields?: Record<string, any>;
  missingRefInCustomRoles?: Record<string, any>;
  missingEnvLocalesInAssets?: Record<string, any>;
  missingEnvLocalesInEntries?: Record<string, any>;
  missingFieldRules?: Record<string, any>;
  missingMultipleFields?: Record<string, any>;
}