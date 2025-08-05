export interface VariantEntry {
  _variant: {
    _uid: string;
    _change_set: string[];
    _instance_uid: string;
    _base_entry_version: number;
  };
  locale: string;
  publish_details: Array<{
    environment: string;
    locale: string;
    time: string;
    user: string;
    version: number;
    variant_uid: string;
    entry_locale: string;
  }>;
}

export interface VariantValidationResult {
  isValid: boolean;
  errors: {
    entry_uid: string;
    publish_locale: string;
    publish_environment: string;
    variant_uid: string;
    entry_locale: string;
    ctUid: string;
    ctLocale: string;
    is_variant: boolean;
    fixStatus?: 'Fixed' | 'Not-Fixed' | 'Fix-Failed';
    fixMessage?: string;
  }[];
}

import { ValidationResult } from './validation-result';

export interface IPublishDetailsValidator {
  validatePublishDetails(entry: VariantEntry, entryUid: string, ctUid: string, locale: string): Promise<ValidationResult>;
}

export interface IVariantFileHandler {
  readVariantFile(filePath: string): Promise<any>;
  writeVariantFile(filePath: string, content: any): Promise<void>;
}

export interface IVariantLogger {
  logError(message: string, args: Record<string, string>): void;
  logInfo(message: string, args: Record<string, string>): void;
}

export interface VariantPublishValidatorConfig {
  environments: string[];
  locales: { code: string }[];
}