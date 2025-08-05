import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { IPublishDetailsValidator, IVariantFileHandler, IVariantLogger, VariantPublishValidatorConfig } from './interfaces';
import { VariantReferenceValidator } from './variant-reference-validator';
import { VariantEntry } from './types';
import { ValidationResult, PublishValidationError } from './validation-result';
import {  auditMsg } from '../../messages';

export class VariantPublishValidator implements IPublishDetailsValidator {
  private readonly referenceValidator: VariantReferenceValidator;

  constructor(
    private readonly config: VariantPublishValidatorConfig,
    private readonly fileHandler: IVariantFileHandler,
    private readonly logger: IVariantLogger,
    private readonly fix: boolean = false,
    entryMetaData: Record<string, any>[] = []
  ) {
    this.referenceValidator = new VariantReferenceValidator(entryMetaData, logger, fix);
  }

  private isValidVariantEntry(entry: unknown): entry is VariantEntry {
    if (!entry || typeof entry !== 'object') return false;
    
    const e = entry as Record<string, unknown>;
    return (
      '_variant' in e &&
      typeof e._variant === 'object' &&
      e._variant !== null &&
      '_uid' in e._variant &&
      typeof e._variant._uid === 'string' &&
      'locale' in e &&
      typeof e.locale === 'string' &&
      'publish_details' in e &&
      Array.isArray(e.publish_details)
    );
  }

  private async fixPublishDetails(entry: VariantEntry, error: PublishValidationError): Promise<void> {
    if (!this.fix) return;

    try {
      // Filter out invalid publish details
      entry.publish_details = entry.publish_details.filter(pd => {
        const isValidLocale = this.config.locales.map(locale => locale.code).includes(pd.locale);
        const isValidEnvironment = this.config.environments.includes(pd.environment);
        return isValidLocale && isValidEnvironment;
      });

      error.fixStatus = 'Fixed';
      error.fixMessage = 'Invalid publish details removed';
    } catch (err) {
      error.fixStatus = 'Fix-Failed';
      error.fixMessage = err instanceof Error ? err.message : 'Unknown error during fix';
    }
  }

  async validatePublishDetails(entry: VariantEntry, entryUid: string, ctUid: string, locale: string): Promise<ValidationResult> {
    if (!entry._variant) {
      return { isValid: true, errors: [] };
    }

    if (!Array.isArray(entry.publish_details)) {
      this.logger.logError(auditMsg.VARIANT_PUBLISH_DETAILS_INVALID_FORMAT, {
        entry_uid: entryUid,
        variant_uid: entry._variant._uid
      });
      
      return {
        isValid: false,
        errors: [{
          type: 'publish' as const,
          entry_uid: entryUid,
          publish_locale: 'invalid',
          publish_environment: 'invalid',
          variant_uid: entry._variant._uid,
          entry_locale: entry.locale || 'invalid',
          ctUid,
          ctLocale: locale,
          is_variant: true,
          fixStatus: this.fix ? 'Not-Fixed' : undefined
        }]
      };
    }

    const errors: PublishValidationError[] = [];
    const validPublishDetails = (await Promise.all(entry.publish_details.map(async (pd) => {
      const isValidLocale = this.config.locales.map(loc => loc.code).includes(pd.locale);
      const isValidEnvironment = this.config.environments.includes(pd.environment);
      const isValidVariant = pd.variant_uid === entry._variant._uid;
      const isValidEntryLocale = pd.entry_locale === entry.locale;

      if (!isValidLocale || !isValidEnvironment || !isValidVariant || !isValidEntryLocale) {
        const error: PublishValidationError = {
          type: 'publish' as const,
          entry_uid: entryUid,
          publish_locale: pd.locale,
          publish_environment: pd.environment,
          variant_uid: pd.variant_uid || 'missing',
          entry_locale: pd.entry_locale || 'missing',
          ctUid,
          ctLocale: locale,
          is_variant: true,
          fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
          fixMessage: undefined
        };

        if (this.fix) {
          await this.fixPublishDetails(entry, error);
        }
        errors.push(error);

        this.logger.logError( auditMsg.VARIANT_PUBLISH_DETAILS_INVALID, {
          variant_uid: pd.variant_uid || 'missing',
          environment: pd.environment,
          locale: pd.locale,
          entry_locale: pd.entry_locale || 'missing'
        });

        return false;
      }
      return pd;
    }))) as VariantEntry['publish_details'];

    entry.publish_details = validPublishDetails.filter(Boolean);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateVariantsInDirectory(basePath: string, entryUid: string, ctUid: string, locale: string): Promise<ValidationResult> {
    const variantsPath = join(basePath, 'variants', entryUid);
    const allErrors: ValidationResult['errors'] = [];

    if (!existsSync(variantsPath)) {
        // this.logger.logInfo(auditMsg.VARIANT_AUDIT_SKIP, { entry_uid: entryUid, ct_uid: ctUid, locale });
        this.logger.logInfo(auditMsg.NOT_VALID_PATH, { path: variantsPath });
        return { isValid: true, errors: [] };
    }

    try {
      const variantFiles = readdirSync(variantsPath)
        .filter(file => file.endsWith('-variant-entry.json'));

      for (const variantFile of variantFiles) {
        const errors = await this.processVariantFile(
          variantFile,
          variantsPath,
          entryUid,
          ctUid,
          locale
        );
        allErrors.push(...errors);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.logError(auditMsg.VARIANT_DIRECTORY_ERROR, {
        path: variantsPath,
        error: errorMessage
      });
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }

  private async processVariantFile(
    variantFile: string,
    variantsPath: string,
    entryUid: string,
    ctUid: string,
    locale: string
  ): Promise<ValidationResult['errors']> {
    const errors: ValidationResult['errors'] = [];
    const ReferenceErrors: ValidationResult['errors'] = [];
    const filePath = join(variantsPath, variantFile);

    try {
      const content = await this.fileHandler.readVariantFile(filePath);
      
      if (!Array.isArray(content)) {
        this.logger.logError(auditMsg.VARIANT_FILE_INVALID_FORMAT, { file: variantFile });
        return errors;
      }

      let hasChanges = false;
      for (const variant of content) {
        if (this.isValidVariantEntry(variant)) {
          const publishResult = await this.validatePublishDetails(variant, entryUid, ctUid, locale);
          if (publishResult.errors.length > 0) {
            hasChanges = true;
          }
          errors.push(...publishResult.errors);

          const referenceResult = this.referenceValidator.validateReferences(variant, entryUid);
          if (referenceResult.errors.length > 0) {
            hasChanges = true;
          }
          ReferenceErrors.push(...referenceResult.errors);
        } else {
          this.logger.logError(auditMsg.VARIANT_INVALID_FORMAT, { file: variantFile });
        }
      }

      // Write fixed content back to file if there were changes
      if (this.fix && hasChanges) {
        await this.fileHandler.writeVariantFile(filePath, content);
        this.logger.logInfo(auditMsg.VARIANT_FIX_SUCCESS, { path: filePath });
      }
    } catch (error) {
      this.logger.logError(auditMsg.VARIANT_FILE_READ_ERROR, {
        file: variantFile,
        error: error instanceof Error ? error.message : String(error)
      });
      errors.push({
        type: 'publish' as const,
        entry_uid: entryUid,
        publish_locale: locale,
        publish_environment: 'unknown',
        variant_uid: 'unknown',
        entry_locale: locale,
        ctUid,
        ctLocale: locale,
        is_variant: true,
        fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
        fixMessage: undefined
      });
    }

    return [...errors, ...ReferenceErrors];
  }
}