import { expect } from '@oclif/test';
import { fancy } from '@contentstack/cli-dev-dependencies';

import { getTableFlags } from '../../../src/util';

describe('getTableFlags method', () => {
  fancy
    .stdout({ print: process.env.PRINT === 'true' || false })
    .it('should return list of table flags required for audit and fix command', () => {
      const actual = getTableFlags();

      expect(actual).has.ownProperty('columns');
      expect(actual).has.ownProperty('sort');
      expect(actual).has.ownProperty('filter');
      expect(actual).has.ownProperty('csv');
      expect(actual).has.ownProperty('no-truncate');
    });

  fancy
    .stdout({ print: process.env.PRINT === 'true' || false })
    .it('should return only specified columns', () => {
      const actual = getTableFlags(['columns', 'csv']);

      expect(actual).has.ownProperty('columns');
      expect(actual).has.ownProperty('csv');
      expect(actual).has.not.ownProperty('no-truncate');
      expect(actual).has.not.ownProperty('sort');
      expect(actual).has.not.ownProperty('filter');
    });
});
