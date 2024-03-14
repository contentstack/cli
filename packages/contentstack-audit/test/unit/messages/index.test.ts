import { fancy } from 'fancy-test';
import { expect } from '@oclif/test';

import { $t, auditMsg } from '../../../src/messages';

describe('messages utility', () => {
  describe('$t method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should replace the placeholder in the string with provided value', () => {
        expect($t(auditMsg.AUDIT_START_SPINNER, { module: 'content-types' })).to.include(
          auditMsg.AUDIT_START_SPINNER.replace(new RegExp(`{module}`, 'g'), 'content-types'),
        );
      });
  });

  describe('$t method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should return if the provided string is empty', () => {
        expect($t('', {})).to.be.empty.string;
      });
  });
});
