import { find } from 'lodash';
import { IVariantLogger } from './interfaces';

import { ValidationResult, ReferenceValidationError } from './validation-result';
import { auditMsg } from '../../messages';

export class VariantReferenceValidator {
  constructor(
    private readonly entryMetaData: Record<string, any>[],
    private readonly logger: IVariantLogger,
    private readonly fix: boolean = false,
  ) {}

  validateReferences(variant: any, entryUid: string): ValidationResult {
    const errors: ReferenceValidationError[] = [];

    if (!variant._metadata?.references || !variant._variant?._change_set) {
      return { isValid: true, errors: [] };
    }

    // Get all values from change set paths
    const changeSetValues = this.accessChangeSetFields(variant, variant._variant._change_set);

    // First validate all references in the variant object against entryMetadata
    for (const { path, value } of changeSetValues) {
      if (Array.isArray(value)) {
        // Check each item in array for references
        for (const item of value) {
          if (item && typeof item === 'object' && item.uid && item._content_type_uid) {
            // Validate against entryMetadata
            const refExists = find(this.entryMetaData, {
              uid: item.uid,
              _content_type_uid: item._content_type_uid,
            });

            if (!refExists) {
              const error: ReferenceValidationError = {
                type: 'reference' as const,
                entry_uid: entryUid,
                reference_uid: item.uid,
                content_type_uid: item._content_type_uid,
                path,
                is_variant: true,
                fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
                fixMessage: `Referenced entry in object not found in entry metadata`,
              };

              if (this.fix) {
                // Remove invalid reference from the array
                const index = value.findIndex(ref => ref.uid === item.uid);
                if (index !== -1) {
                  value.splice(index, 1);
                  error.fixStatus = 'Fixed';
                  error.fixMessage = 'Invalid reference removed from object';
                }
              }

              errors.push(error);
              
              this.logger.logError(auditMsg.VARIANT_REFERENCE_INVALID, {
                entry_uid: entryUid,
                reference_uid: item.uid,
                content_type_uid: item._content_type_uid,
                path,
              });
            }
          }
        }
      }
    }

    // Then validate all references in metadata against entryMetadata
    for (const reference of variant._metadata.references) {
      const { uid, _content_type_uid, path } = reference;



      // First check if the path exists in the object
      const pathValue = changeSetValues.find(v => v.path === path)?.value;
      if (!pathValue) {
        const error: ReferenceValidationError = {
          type: 'reference' as const,
          entry_uid: entryUid,
          reference_uid: uid,
          content_type_uid: _content_type_uid,
          path,
          is_variant: true,
          fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
          fixMessage: `Reference path ${path} not found in object`,
        };

        if (this.fix) {
          // Remove reference from metadata if path doesn't exist
          const referenceIndex = variant._metadata.references.findIndex(
            (ref: { uid: string; _content_type_uid: string; path: string }) =>
              ref.uid === uid && ref._content_type_uid === _content_type_uid && ref.path === path,
          );
          if (referenceIndex !== -1) {
            variant._metadata.references.splice(referenceIndex, 1);
            error.fixStatus = 'Fixed';
            error.fixMessage = 'Removed reference from metadata as path does not exist';
          }
        }

        errors.push(error);
        continue;
      }

      // Then validate against entryMetadata
      const refExists = find(this.entryMetaData, {
        uid,
        _content_type_uid,
      });

      if (!refExists) {
        const error: ReferenceValidationError = {
          type: 'reference' as const,
          entry_uid: entryUid,
          reference_uid: uid,
          content_type_uid: _content_type_uid,
          path,
          is_variant: true,
          fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
          fixMessage: `Referenced entry in metadata not found in entry metadata`,
        };

        if (this.fix) {
          // Remove invalid reference from metadata
          const referenceIndex = variant._metadata.references.findIndex(
            (ref: { uid: string; _content_type_uid: string; path: string }) =>
              ref.uid === uid && ref._content_type_uid === _content_type_uid && ref.path === path,
          );
          if (referenceIndex !== -1) {
            variant._metadata.references.splice(referenceIndex, 1);
            error.fixStatus = 'Fixed';
            error.fixMessage = 'Invalid reference removed from metadata';
          }
        }

        errors.push(error);
        
        this.logger.logError(auditMsg.VARIANT_REFERENCE_INVALID, {
          entry_uid: entryUid,
          reference_uid: uid,
          content_type_uid: _content_type_uid,
          path,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  accessChangeSetFields(obj: any, changeSet: string[]) {
    function getNestedValue(obj: any, path: string) {
      try {
        return path.split('.').reduce((current, key) => {
          if (current && typeof current === 'object') {
            return current[key];
          }
          return undefined;
        }, obj);
      } catch (error) {
        console.error(`Error accessing path ${path}:`, error);
        return undefined;
      }
    }

    const result = changeSet.map((path) => {
      const value = getNestedValue(obj, path);
      return { path, value };
    });

    return result;
  }
}
