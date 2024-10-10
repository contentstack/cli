
const { expect } = require('chai');
const inquirer = require('inquirer');
const {
  chooseStack,
  getEntries,
  getEnvironments,
  chooseLanguage,
  getOrgUsers,
  getOrgRoles,
  getMappedUsers,
  getMappedRoles,
  cleanEntries,
  determineUserOrgRole,
} = require('../../src/util/index');
const sinon = require('sinon');
const util = require('../../src/util')

describe('Test Util functions', () => {
  let managementAPIClientMock;

  beforeEach(() => {
    managementAPIClientMock = {
      organization: sinon.stub(),
      getUser: sinon.stub(),
      stack: sinon.stub(),
      contentType: sinon.stub(),
      locale: sinon.stub(),
      environment: sinon.stub(),
    };
  });

  describe('Choose Stack', () => {
    it('should return chosen stack', async () => {
      managementAPIClientMock.stack.returns({
        query: () => ({
          find: async () => ({ items: [{ name: 'Stack1', api_key: 'key1' }] }),
        }),
      });
      inquirer.prompt = async () => ({ chosenStack: 'Stack1' });
      const result = await chooseStack(managementAPIClientMock, 'orgUid');
      expect(result).to.deep.equal({ name: 'Stack1', apiKey: 'key1' });
    });
  });

  describe('Get Entries', () => {
    it('should return entries', async () => {
      managementAPIClientMock.contentType.returns({
        entry: () => ({
          query: () => ({
            find: async () => [{ title: 'Entry1' }, { title: 'Entry2' }],
          }),
        }),
      });

      const result = await getEntries(managementAPIClientMock, 'contentTypeUid', 'en', 0, 100);
      expect(result).to.deep.equal([{ title: 'Entry1' }, { title: 'Entry2' }]);
    });
  });

  describe('Get Environments', () => {
    it('should return environments', async () => {
      managementAPIClientMock.environment.returns({
        query: () => ({
          find: async () => ({ items: [{ uid: 'env1', name: 'Environment1' }] }),
        }),
      });

      const result = await getEnvironments(managementAPIClientMock);
      expect(result).to.deep.equal({ env1: 'Environment1' });
    });
  });

  describe('Choose Language', () => {
    it('should return chosen language', async () => {
      managementAPIClientMock.locale.returns({
        query: () => ({
          find: async () => ({ items: [{ name: 'English', code: 'en' }] }),
        }),
      });
      inquirer.prompt = async () => ({ chosenLanguage: 'English' });

      const result = await chooseLanguage(managementAPIClientMock);
      expect(result).to.deep.equal({ name: 'English', code: 'en' });
    });
  });

  describe('Get Org Users', () => {
    it('should return organization users', async () => {
      managementAPIClientMock.getUser.returns(Promise.resolve({
        organizations: [{ uid: 'orgUid', is_owner: true }],
      }));
      managementAPIClientMock.organization.returns({
        getInvitations: async () => ({ items: [{ user_uid: 'user1', email: 'user1@example.com' }] }),
      });
      const result = await getOrgUsers(managementAPIClientMock, 'orgUid');
      expect(result).to.deep.equal({ items: [{ user_uid: 'user1', email: 'user1@example.com' }] });
    });

    it('should return an error when user is not an admin of the organization', async () => {
      managementAPIClientMock.getUser.returns(Promise.resolve({
        organizations: [{ uid: 'orgUid', org_roles: [] }],
      }));
      try { await getOrgUsers(managementAPIClientMock, 'orgUid'); }
      catch (error) {
        expect(error.message).to.include('Unable to export data. Make sure you\'re an admin or owner of this organization');
      }
    });
  });

  describe('Get Org Roles', () => {
    it('should return organization roles', async () => {
      managementAPIClientMock.getUser.returns(Promise.resolve({
        organizations: [{ uid: 'orgUid', is_owner: true }],
      }));
      managementAPIClientMock.organization.returns({
        roles: async () => ({ items: [{ uid: 'role1', name: 'Admin' }] }),
      });

      const result = await getOrgRoles(managementAPIClientMock, 'orgUid');
      expect(result).to.deep.equal({ items: [{ uid: 'role1', name: 'Admin' }] });
    });

    it('should return an error when user is not an admin of the organization', async () => {
      managementAPIClientMock.getUser.returns(Promise.resolve({
        organizations: [{ uid: 'orgUid', org_roles: [] }],
      }));
      try { await getOrgRoles(managementAPIClientMock, 'orgUid'); }
      catch (error) {
        expect(error.message).to.include('Unable to export data. Make sure you\'re an admin or owner of this organization');
      }
    });
  });

  describe('Get Mapped Users', () => {
    it('should return mapped users', () => {
      const users = { items: [{ user_uid: 'user1', email: 'user1@example.com' }] };
      const result = getMappedUsers(users);
      expect(result).to.deep.equal({ user1: 'user1@example.com', System: 'System' });
    });
  });

  describe('Get Mapped Roles', () => {
    it('should return mapped roles', () => {
      const roles = { items: [{ uid: 'role1', name: 'Admin' }] };
      const result = getMappedRoles(roles);
      expect(result).to.deep.equal({ role1: 'Admin' });
    });
  });

  describe('Clean Entries', () => {
    it('should filter and format entries correctly', () => {
      const entries = [
        {
          locale: 'en',
          publish_details: [{ environment: 'env1', locale: 'en', time: '2021-01-01' }],
          _workflow: { name: 'Workflow1' },
          otherField: 'value',
        },
      ];
      const environments = { env1: 'Production' };
      const contentTypeUid = 'contentTypeUid';

      const result = cleanEntries(entries, 'en', environments, contentTypeUid);
      expect(result).to.deep.equal([
        {
          locale: 'en',
          publish_details: ['["Production","en","2021-01-01"]'],
          _workflow: 'Workflow1',
          ACL: '{}',
          content_type_uid: contentTypeUid,
          otherField: 'value',
        },
      ]);
    });
  });

  describe('Get DateTime', () => {
    it('should return a string', () => {
      expect(util.getDateTime()).to.be.a('string');
    });
  });

  describe('Determine User Organization Role', () => {
    it('should return "Owner" if the user is an owner', () => {
      const user = { is_owner: true };
      const result = determineUserOrgRole(user, {});
      expect(result).to.equal('Owner');
    });

    it('should return role name based on org roles', () => {
      const user = { org_roles: ['role1'] };
      const roles = { role1: 'Admin' };
      const result = determineUserOrgRole(user, roles);
      expect(result).to.equal('Admin');
    });

    it('should return "No Role" if there are no roles', () => {
      const user = { org_roles: [] };
      const result = determineUserOrgRole(user, {});
      expect(result).to.equal('No Role');
    });
  });
});
