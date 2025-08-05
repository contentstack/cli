import { find } from 'lodash';
import { IVariantLogger } from './interfaces';

import { ValidationResult, ReferenceValidationError } from './validation-result';
import { auditMsg } from '../../messages';

export class VariantReferenceValidator {
  constructor(
    private readonly entryMetaData: Record<string, any>[],
    private readonly logger: IVariantLogger,
    private readonly fix: boolean = false
  ) {}

  validateReferences(variant: any, entryUid: string): ValidationResult {
    const errors: ReferenceValidationError[] = [];
    
    if (!variant._metadata?.references) {
      return { isValid: true, errors: [] };
    }

    for (const reference of variant._metadata.references) {
      const { uid, _content_type_uid, path } = reference;
      let referenceUid = uid;

      // Handle both direct UIDs and reference objects
      if (!uid && typeof reference === 'string' && reference.startsWith('blt')) {
        referenceUid = reference;
      }

      const refExists = find(this.entryMetaData, { uid: referenceUid });
      if (!refExists) {
        const error: ReferenceValidationError = {
          type: 'reference' as const,
          entry_uid: entryUid,
          reference_uid: referenceUid,
          content_type_uid: _content_type_uid,
          path,
          is_variant: true,
          fixStatus: this.fix ? ('Not-Fixed' as const) : undefined,
          fixMessage: undefined
        };

        if (this.fix) {
          // In fix mode, we'll remove the invalid reference from the metadata
          const referenceIndex = variant._metadata.references.findIndex((ref: { uid?: string } | string) => 
            ref === reference || (typeof ref === 'object' && ref.uid === referenceUid)
          );
          if (referenceIndex !== -1) {
            variant._metadata.references.splice(referenceIndex, 1);
            error.fixStatus = 'Fixed';
            error.fixMessage = 'Invalid reference removed from metadata';
          } else {
            error.fixStatus = 'Fix-Failed';
            error.fixMessage = 'Could not find reference in metadata to remove';
          }
        }

        errors.push(error);
        
        this.logger.logError(auditMsg.VARIANT_REFERENCE_INVALID, {
          entry_uid: entryUid,
          reference_uid: uid,
          content_type_uid: _content_type_uid,
          path
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}