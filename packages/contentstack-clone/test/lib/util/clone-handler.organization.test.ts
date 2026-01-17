import { expect } from 'chai';
import { CloneHandler } from '../../../src/core/util/clone-handler';
import { CloneConfig } from '../../../src/types/clone-config';
import sinon from 'sinon';
import inquirer from 'inquirer';

describe('CloneHandler - Organization', () => {
  describe('getOrganizationChoices', () => {
    let handler: CloneHandler;
    let mockClient: any;
    let sandbox: sinon.SinonSandbox;
    let configHandlerGetStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      // Mock configHandler FIRST before creating handler to prevent real API calls
      const cliUtilitiesModule = require('@contentstack/cli-utilities');
      const configHandler = require('@contentstack/cli-utilities').configHandler;
      configHandlerGetStub = sandbox.stub(configHandler, 'get').returns(undefined);
      
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      // Mock SDK: client.organization() and client.organization(uid) both return object with fetchAll() and fetch()
      // Create a single mock object that will be returned each time organization() is called (with or without params)
      const orgMock = {
        fetchAll: sandbox.stub().resolves({ items: [] }),
        fetch: sandbox.stub().resolves({}),
      };
      mockClient = {
        organization: sandbox.stub().returns(orgMock), // Returns same mock for both organization() and organization(uid)
      };
      handler.setClient(mockClient);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should fetch organizations and return choices', async () => {
      const mockOrgs = {
        items: [
          { name: 'Org1', uid: 'uid1' },
          { name: 'Org2', uid: 'uid2' },
        ] as Array<{ name: string; uid: string }>,
      };

      // Mock SDK call: client.organization().fetchAll()
      const orgMock = mockClient.organization();
      orgMock.fetchAll.resolves(mockOrgs);

      const result = await handler.getOrganizationChoices('Test message');
      expect(result).to.have.property('type', 'list');
      expect(result).to.have.property('name', 'Organization');
      expect(result).to.have.property('message', 'Test message');
      expect(result.choices).to.have.length(2);
      expect(result.choices).to.include('Org1');
      expect(result.choices).to.include('Org2');
    });

    it('should use default message if not provided', async () => {
      const mockOrgs = { items: [] as Array<{ name: string; uid: string }> };
      // Mock SDK call: client.organization().fetchAll()
      const orgMock = mockClient.organization();
      orgMock.fetchAll.resolves(mockOrgs);

      const result = await handler.getOrganizationChoices();
      expect(result.message).to.equal('Choose an organization');
    });

    it('should handle single organization (no items array)', async () => {
      const mockOrg = { name: 'SingleOrg', uid: 'uid1' };
      // Mock SDK call: client.organization().fetchAll()
      const orgMock = mockClient.organization();
      orgMock.fetchAll.resolves(mockOrg);

      const result = await handler.getOrganizationChoices();
      expect(result.choices).to.have.length(1);
      expect(result.choices[0]).to.equal('SingleOrg');
    });

    it('should fetch organization by configOrgUid when oauthOrgUid is set (covers lines 91-92)', async () => {
      // Set configOrgUid
      configHandlerGetStub.withArgs('oauthOrgUid').returns('test-org-uid');
      
      const mockOrg = { name: 'ConfigOrg', uid: 'test-org-uid' };
      // Mock SDK call: client.organization(uid).fetch()
      const orgMock = mockClient.organization('test-org-uid');
      orgMock.fetch.resolves(mockOrg);

      const result = await handler.getOrganizationChoices();

      expect(result.choices).to.have.length(1);
      expect(result.choices[0]).to.equal('ConfigOrg');
      expect((handler as any).orgUidList['ConfigOrg']).to.equal('test-org-uid');
      expect(orgMock.fetch.calledOnce).to.be.true;
    });
  });

  describe('handleOrgSelection', () => {
    let handler: CloneHandler;
    let mockClient: any;
    let sandbox: sinon.SinonSandbox;
    let configHandlerGetStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      // Mock configHandler FIRST before creating handler to prevent real API calls
      const cliUtilitiesModule = require('@contentstack/cli-utilities');
      const configHandler = require('@contentstack/cli-utilities').configHandler;
      configHandlerGetStub = sandbox.stub(configHandler, 'get').returns(undefined);
      
      const config: CloneConfig = {
        cloneContext: {
          command: 'test',
          module: 'clone',
          email: 'test@example.com',
        },
      };
      handler = new CloneHandler(config);
      // Mock SDK: client.organization() and client.organization(uid) both return object with fetchAll() and fetch()
      // Create a single mock object that will be returned each time organization() is called (with or without params)
      const orgMock = {
        fetchAll: sandbox.stub().resolves({ items: [] }),
        fetch: sandbox.stub().resolves({}),
      };
      mockClient = {
        organization: sandbox.stub().returns(orgMock), // Returns same mock for both organization() and organization(uid)
      };
      handler.setClient(mockClient);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should handle organization selection for source', async () => {
      const mockOrgs = {
        items: [{ name: 'TestOrg', uid: 'test-uid' }] as Array<{ name: string; uid: string }>,
      };
      // Mock SDK call: client.organization().fetchAll()
      const orgMock = mockClient.organization();
      orgMock.fetchAll.resolves(mockOrgs);

      // Mock inquirer
      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ Organization: 'TestOrg' });

      const result = await handler.handleOrgSelection({ msg: 'Select org', isSource: true });

      expect(result).to.have.property('Organization', 'TestOrg');
    });

    it('should handle organization selection for target', async () => {
      const mockOrgs = {
        items: [{ name: 'TestOrg', uid: 'test-uid' }] as Array<{ name: string; uid: string }>,
      };
      // Mock SDK call: client.organization().fetchAll()
      const orgMock = mockClient.organization();
      orgMock.fetchAll.resolves(mockOrgs);

      const inquirerStub = sandbox.stub(inquirer, 'prompt').resolves({ Organization: 'TestOrg' });

      const result = await handler.handleOrgSelection({ msg: 'Select org', isSource: false });

      expect(result).to.have.property('Organization', 'TestOrg');
    });
  });
});
