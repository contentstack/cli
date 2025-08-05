interface BaseValidationError {
  entry_uid: string;
  is_variant: boolean;
  fixStatus?: 'Fixed' | 'Not-Fixed' | 'Fix-Failed';
  fixMessage?: string;
}

export interface PublishValidationError extends BaseValidationError {
  type: 'publish';
  publish_locale: string;
  publish_environment: string;
  variant_uid: string;
  entry_locale: string;
  ctUid: string;
  ctLocale: string;
}

export interface ReferenceValidationError extends BaseValidationError {
  type: 'reference';
  reference_uid: string;
  content_type_uid: string;
  path: string;
}

export type ValidationError = PublishValidationError | ReferenceValidationError;

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}