import { expect } from 'chai';
import {
  flatten,
  sanitizeData,
  cleanEntries,
  getMappedUsers,
  getMappedRoles,
  determineUserOrgRole,
  cleanOrgUsers,
  getTeamsUserDetails,
  formatTaxonomiesData,
  formatTermsOfTaxonomyData,
  kebabize,
  getFormattedDate,
  getDateTime,
} from '../../../dist/utils/data-transform';

describe('data-transform', () => {
  describe('flatten', () => {
    it('should flatten a simple nested object', () => {
      const input = { a: { b: { c: 1 } } };
      const result = flatten(input);
      expect(result).to.deep.equal({ 'a.b.c': 1 });
    });

    it('should flatten arrays with bracket notation', () => {
      const input = { items: ['a', 'b', 'c'] };
      const result = flatten(input);
      expect(result).to.deep.equal({
        'items[0]': 'a',
        'items[1]': 'b',
        'items[2]': 'c',
      });
    });

    it('should handle empty arrays', () => {
      const input = { items: [] };
      const result = flatten(input);
      expect(result).to.deep.equal({ items: [] });
    });

    it('should handle empty objects', () => {
      const input = { nested: {} };
      const result = flatten(input);
      expect(result).to.deep.equal({ nested: {} });
    });

    it('should handle mixed nested structures', () => {
      const input = {
        user: {
          name: 'John',
          addresses: [{ city: 'NYC' }, { city: 'LA' }],
        },
      };
      const result = flatten(input);
      expect(result).to.deep.equal({
        'user.name': 'John',
        'user.addresses[0].city': 'NYC',
        'user.addresses[1].city': 'LA',
      });
    });

    it('should handle primitive values at root', () => {
      const input = { name: 'test', count: 5, active: true };
      const result = flatten(input);
      expect(result).to.deep.equal({ name: 'test', count: 5, active: true });
    });

    it('should handle null values', () => {
      const input = { value: null };
      const result = flatten(input);
      expect(result).to.deep.equal({ value: null });
    });
  });

  describe('sanitizeData', () => {
    it('should prefix strings starting with + to prevent CSV injection', () => {
      const input = { formula: '+1234' };
      const result = sanitizeData(input);
      expect(result.formula).to.equal(`"'+1234"`);
    });

    it('should prefix strings starting with = to prevent CSV injection', () => {
      const input = { formula: '=SUM(A1:A10)' };
      const result = sanitizeData(input);
      expect(result.formula).to.equal(`"'=SUM(A1:A10)"`);
    });

    it('should prefix strings starting with @ to prevent CSV injection', () => {
      const input = { mention: '@user' };
      const result = sanitizeData(input);
      expect(result.mention).to.equal(`"'@user"`);
    });

    it('should prefix strings starting with - to prevent CSV injection', () => {
      const input = { value: '-100' };
      const result = sanitizeData(input);
      expect(result.value).to.equal(`"'-100"`);
    });

    it('should escape double quotes in dangerous strings', () => {
      const input = { formula: '=A1"test"' };
      const result = sanitizeData(input);
      expect(result.formula).to.equal(`"'=A1""test"""`);
    });

    it('should convert objects to JSON strings', () => {
      const input = { nested: { key: 'value' } };
      const result = sanitizeData(input);
      expect(result.nested).to.equal('{"key":"value"}');
    });

    it('should convert arrays to JSON strings', () => {
      const input = { items: [1, 2, 3] };
      const result = sanitizeData(input);
      expect(result.items).to.equal('[1,2,3]');
    });

    it('should not modify safe strings', () => {
      const input = { safe: 'Hello World' };
      const result = sanitizeData(input);
      expect(result.safe).to.equal('Hello World');
    });

    it('should leave null values as null (typeof object but null check)', () => {
      const input = { value: null } as Record<string, unknown>;
      const result = sanitizeData(input);
      // null passes the typeof object check but null !== null is false, so it stays null
      // The condition is: typeof value === 'object' && value !== null
      // For null: typeof null === 'object' is true, but value !== null is false (null === null)
      // So the JSON.stringify branch is NOT taken for null
      expect(result.value).to.be.null;
    });
  });

  describe('cleanEntries', () => {
    const mockEnvironments = {
      env1: 'production',
      env2: 'staging',
    };

    it('should filter entries by language', () => {
      const entries = [
        { uid: '1', title: 'English', locale: 'en-us' },
        { uid: '2', title: 'French', locale: 'fr-fr' },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result).to.have.lengthOf(1);
      expect(result[0].uid).to.equal('1');
    });

    it('should flatten entry data', () => {
      const entries = [
        {
          uid: '1',
          title: 'Test',
          locale: 'en-us',
          nested: { field: 'value' },
        },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result[0]['nested.field']).to.equal('value');
    });

    it('should format publish_details with environment names', () => {
      const entries = [
        {
          uid: '1',
          title: 'Test',
          locale: 'en-us',
          publish_details: [
            { environment: 'env1', locale: 'en-us', time: '2024-01-01' },
          ],
        },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result[0].publish_details).to.have.lengthOf(1);
      expect(result[0].publish_details[0]).to.include('production');
    });

    it('should extract workflow name', () => {
      const entries = [
        {
          uid: '1',
          title: 'Test',
          locale: 'en-us',
          _workflow: { name: 'Review' },
        },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result[0]._workflow).to.equal('Review');
    });

    it('should set content_type_uid', () => {
      const entries = [
        { uid: '1', title: 'Test', locale: 'en-us' },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog_post');
      expect(result[0].content_type_uid).to.equal('blog_post');
    });

    it('should remove SDK methods from entry', () => {
      const entries = [
        {
          uid: '1',
          title: 'Test',
          locale: 'en-us',
          stackHeaders: {},
          update: () => {},
          delete: () => {},
          fetch: () => {},
          publish: () => {},
          unpublish: () => {},
          import: () => {},
          publishRequest: () => {},
        },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result[0]).to.not.have.property('stackHeaders');
      expect(result[0]).to.not.have.property('update');
      expect(result[0]).to.not.have.property('delete');
      expect(result[0]).to.not.have.property('fetch');
    });

    it('should return empty array when no entries match locale', () => {
      const entries = [
        { uid: '1', title: 'French', locale: 'fr-fr' },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result).to.have.lengthOf(0);
    });

    it('should set ACL to empty object JSON', () => {
      const entries = [
        { uid: '1', title: 'Test', locale: 'en-us' },
      ] as any[];

      const result = cleanEntries(entries, 'en-us', mockEnvironments, 'blog');
      expect(result[0].ACL).to.equal('{}');
    });
  });

  describe('getMappedUsers', () => {
    it('should map user UIDs to emails', () => {
      const users = {
        items: [
          { user_uid: 'uid1', email: 'user1@test.com' },
          { user_uid: 'uid2', email: 'user2@test.com' },
        ],
      } as any;

      const result = getMappedUsers(users);
      expect(result).to.deep.equal({
        uid1: 'user1@test.com',
        uid2: 'user2@test.com',
        System: 'System',
      });
    });

    it('should always include System mapping', () => {
      const users = { items: [] } as any;
      const result = getMappedUsers(users);
      expect(result).to.have.property('System', 'System');
    });
  });

  describe('getMappedRoles', () => {
    it('should map role UIDs to names', () => {
      const roles = {
        items: [
          { uid: 'role1', name: 'Admin' },
          { uid: 'role2', name: 'Editor' },
        ],
      } as any;

      const result = getMappedRoles(roles);
      expect(result).to.deep.equal({
        role1: 'Admin',
        role2: 'Editor',
      });
    });

    it('should return empty object for empty roles', () => {
      const roles = { items: [] } as any;
      const result = getMappedRoles(roles);
      expect(result).to.deep.equal({});
    });
  });

  describe('determineUserOrgRole', () => {
    const mockRoles = {
      role1: 'Admin',
      role2: 'Editor',
    };

    it('should return role name from org_roles', () => {
      const user = { org_roles: ['role1'] } as any;
      const result = determineUserOrgRole(user, mockRoles);
      expect(result).to.equal('Admin');
    });

    it('should return Owner if user is owner', () => {
      const user = { org_roles: ['role1'], is_owner: true } as any;
      const result = determineUserOrgRole(user, mockRoles);
      expect(result).to.equal('Owner');
    });

    it('should return No Role if no org_roles', () => {
      const user = {} as any;
      const result = determineUserOrgRole(user, mockRoles);
      expect(result).to.equal('No Role');
    });

    it('should return No Role if org_roles is empty', () => {
      const user = { org_roles: [] } as any;
      const result = determineUserOrgRole(user, mockRoles);
      expect(result).to.equal('No Role');
    });
  });

  describe('cleanOrgUsers', () => {
    it('should format org users for CSV export', () => {
      const orgUsers = {
        items: [
          {
            email: 'user@test.com',
            user_uid: 'uid1',
            org_roles: ['role1'],
            status: 'active',
            invited_by: 'uid2',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-16T00:00:00Z',
          },
        ],
      } as any;

      const mappedUsers = { uid1: 'user@test.com', uid2: 'inviter@test.com', System: 'System' };
      const mappedRoles = { role1: 'Admin' };

      const result = cleanOrgUsers(orgUsers, mappedUsers, mappedRoles);

      expect(result).to.have.lengthOf(1);
      expect(result[0].Email).to.equal('user@test.com');
      expect(result[0]['User UID']).to.equal('uid1');
      expect(result[0]['Organization Role']).to.equal('Admin');
      expect(result[0].Status).to.equal('active');
      expect(result[0]['Invited By']).to.equal('inviter@test.com');
    });

    it('should use System for unknown inviter', () => {
      const orgUsers = {
        items: [
          {
            email: 'user@test.com',
            user_uid: 'uid1',
            org_roles: [],
            status: 'active',
            invited_by: 'unknown_uid',
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-01-16T00:00:00Z',
          },
        ],
      } as any;

      const mappedUsers = { uid1: 'user@test.com', System: 'System' };
      const mappedRoles = {};

      const result = cleanOrgUsers(orgUsers, mappedUsers, mappedRoles);
      expect(result[0]['Invited By']).to.equal('System');
    });
  });

  describe('getTeamsUserDetails', () => {
    it('should extract all users from teams with team info', () => {
      const teams = [
        {
          uid: 'team1',
          name: 'Team A',
          users: [
            { userId: 'u1', email: 'user1@test.com', active: true },
            { userId: 'u2', email: 'user2@test.com', active: false },
          ],
        },
        {
          uid: 'team2',
          name: 'Team B',
          users: [
            { userId: 'u3', email: 'user3@test.com', orgInvitationStatus: 'pending' },
          ],
        },
      ] as any[];

      const result = getTeamsUserDetails(teams);

      expect(result).to.have.lengthOf(3);
      expect(result[0]['team-name']).to.equal('Team A');
      expect(result[0]['team-uid']).to.equal('team1');
      expect(result[0]).to.not.have.property('active');
      expect(result[2]).to.not.have.property('orgInvitationStatus');
    });

    it('should handle teams with no users', () => {
      const teams = [
        { uid: 'team1', name: 'Team A', users: [] },
        { uid: 'team2', name: 'Team B' },
      ] as any[];

      const result = getTeamsUserDetails(teams);
      expect(result).to.have.lengthOf(0);
    });
  });

  describe('formatTaxonomiesData', () => {
    it('should format taxonomies for CSV export', () => {
      const taxonomies = [
        { uid: 'tax1', name: 'Category', description: 'Main categories' },
        { uid: 'tax2', name: 'Tags', description: '' },
      ] as any[];

      const result = formatTaxonomiesData(taxonomies);

      expect(result).to.have.lengthOf(2);
      expect(result![0]['Taxonomy UID']).to.equal('tax1');
      expect(result![0].Name).to.equal('Category');
      expect(result![0].Description).to.equal('Main categories');
      expect(result![1].Description).to.equal('');
    });

    it('should handle missing description', () => {
      const taxonomies = [
        { uid: 'tax1', name: 'Category' },
      ] as any[];

      const result = formatTaxonomiesData(taxonomies);
      expect(result![0].Description).to.equal('');
    });

    it('should return undefined for empty array', () => {
      const result = formatTaxonomiesData([]);
      expect(result).to.be.undefined;
    });

    it('should return undefined for undefined input', () => {
      const result = formatTaxonomiesData(undefined as any);
      expect(result).to.be.undefined;
    });
  });

  describe('formatTermsOfTaxonomyData', () => {
    it('should format terms for CSV export', () => {
      const terms = [
        { uid: 'term1', name: 'Tech', parent_uid: null, depth: 0 },
        { uid: 'term2', name: 'Software', parent_uid: 'term1', depth: 1 },
      ] as any[];

      const result = formatTermsOfTaxonomyData(terms, 'tax1');

      expect(result).to.have.lengthOf(2);
      expect(result![0]['Taxonomy UID']).to.equal('tax1');
      expect(result![0].UID).to.equal('term1');
      expect(result![0].Name).to.equal('Tech');
      expect(result![0]['Parent UID']).to.be.null;
      expect(result![0].Depth).to.equal(0);
      expect(result![1]['Parent UID']).to.equal('term1');
    });

    it('should return undefined for empty array', () => {
      const result = formatTermsOfTaxonomyData([], 'tax1');
      expect(result).to.be.undefined;
    });

    it('should return undefined for undefined input', () => {
      const result = formatTermsOfTaxonomyData(undefined as any, 'tax1');
      expect(result).to.be.undefined;
    });
  });

  describe('kebabize', () => {
    it('should convert spaces to hyphens and lowercase', () => {
      expect(kebabize('Hello World')).to.equal('hello-world');
    });

    it('should handle single word', () => {
      expect(kebabize('Hello')).to.equal('hello');
    });

    it('should handle multiple spaces', () => {
      expect(kebabize('One Two Three')).to.equal('one-two-three');
    });

    it('should handle already lowercase', () => {
      expect(kebabize('already lowercase')).to.equal('already-lowercase');
    });

    it('should handle empty string', () => {
      expect(kebabize('')).to.equal('');
    });
  });

  describe('getFormattedDate', () => {
    it('should format Date object to MM/DD/YYYY', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getFormattedDate(date);
      expect(result).to.match(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should format date string to MM/DD/YYYY', () => {
      const result = getFormattedDate('2024-01-15T12:00:00Z');
      expect(result).to.match(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2024-01-05T12:00:00Z');
      const result = getFormattedDate(date);
      expect(result).to.include('/05/');
    });
  });

  describe('getDateTime', () => {
    it('should return formatted date-time string', () => {
      const result = getDateTime();
      // Format should be like "1-15-2024_12:00:00PM" or similar locale-dependent
      expect(result).to.be.a('string');
      expect(result).to.include('_');
      expect(result).to.include('-');
    });
  });
});
