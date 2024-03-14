//@ts-nocheck
import { expect } from 'chai';
import { stub, createSandbox } from 'sinon';
import { cliux } from '@contentstack/cli-utilities';
import fs from 'fs';
import { FileUpload, BaseClass } from '../../../src/adapters';
import { BaseCommand } from '../../../src/commands/launch/base-command';

describe('File Upload', () => {
  let inquireStub, prepareApiClientsStub, prepareConfigStub, getConfigStub;
  let adapterConstructorInputs;

  beforeEach(() => {
    inquireStub = stub(cliux, 'inquire');
    prepareConfigStub = stub(BaseCommand.prototype, 'prepareConfig').resolves();
    prepareApiClientsStub = stub(BaseCommand.prototype, 'prepareApiClients').resolves();
    getConfigStub = stub(BaseCommand.prototype, 'getConfig').resolves();

    adapterConstructorInputs = {
      config: getConfigStub,
      apolloClient: prepareApiClientsStub,
      analyticsInfo: 'this.context.analyticsInfo',
    };
  });

  afterEach(() => {
    inquireStub.restore();
    prepareConfigStub.restore();
    getConfigStub.restore();
    prepareApiClientsStub.restore();
  });

  describe('Run', () => {
    let initApolloClientStub,
      createSignedUploadUrlStub,
      archiveStub,
      uploadFileStub,
      createNewDeploymentStub,
      prepareForNewProjectCreationStub,
      createNewProjectStub,
      prepareLaunchConfigStub,
      showLogsStub,
      showDeploymentUrlStub,
      showSuggestionStub;

    let adapterConstructorOptions = {
      config: { isExistingProject: true, currentConfig: { uid: '123244', organizationUid: 'bltxxxxxxxx' } },
    };
    beforeEach(() => {
      initApolloClientStub = stub(BaseClass.prototype, 'initApolloClient').resolves();
      createSignedUploadUrlStub = stub(FileUpload.prototype, 'createSignedUploadUrl').resolves();
      archiveStub = stub(FileUpload.prototype, 'archive').resolves({ zipName: 'test.zip', zipPath: '/path/to/zip' });
      uploadFileStub = stub(FileUpload.prototype, 'uploadFile').resolves();
      createNewDeploymentStub = stub(FileUpload.prototype, 'createNewDeployment').resolves();
      prepareForNewProjectCreationStub = stub(FileUpload.prototype, 'prepareForNewProjectCreation').resolves();
      createNewProjectStub = stub(FileUpload.prototype, 'createNewProject').resolves();

      prepareLaunchConfigStub = stub(BaseClass.prototype, 'prepareLaunchConfig').resolves();
      showLogsStub = stub(BaseClass.prototype, 'showLogs').resolves();
      showDeploymentUrlStub = stub(BaseClass.prototype, 'showDeploymentUrl').resolves();
      showSuggestionStub = stub(BaseClass.prototype, 'showSuggestion').resolves();
    });

    afterEach(() => {
      initApolloClientStub.restore();
      createSignedUploadUrlStub.restore();
      archiveStub.restore();
      uploadFileStub.restore();
      createNewDeploymentStub.restore();
      prepareForNewProjectCreationStub.restore();
      createNewProjectStub.restore();
      prepareLaunchConfigStub.restore();
      showLogsStub.restore();
      showDeploymentUrlStub.restore();
      showSuggestionStub.restore();
    });

    it('should run github flow', async () => {
      new FileUpload(adapterConstructorOptions).run();
    });
  });

  describe('createNewProject', () => {
    let sandbox;
    let adapterConstructorOptions = {
      config: {
        framework: 'React',
        projectName: 'New Project',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        environmentName: 'Production',
        currentConfig: null,
      },
    };
    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should log a success message and update the config when the mutation succeeds', async () => {
      const apolloClientMutateStub = sandbox.stub().resolves({
        data: {
          project: {
            environments: [
              {
                deployments: {
                  edges: [{ node: 'deployment1' }, { node: 'deployment2' }],
                },
              },
            ],
          },
        },
      });
      const signedUploadUrlData = {
        uploadUid: '123456789',
      };
      const apolloClient = {
        mutate: apolloClientMutateStub,
      };

      const fileUploadInstance = new FileUpload(adapterConstructorOptions);
      fileUploadInstance.apolloClient = apolloClient;
      fileUploadInstance.signedUploadUrlData = signedUploadUrlData;

      await fileUploadInstance.createNewProject();

      expect(apolloClientMutateStub.calledOnce).to.be.true;
    });
  });

  describe('prepareForNewProjectCreation', () => {
    let createSignedUploadUrlStub,
      archiveStub,
      uploadFileStub,
      selectOrgStub,
      detectFrameworkStub,
      handleEnvImportFlowStub;
    let adapterConstructorOptions = {
      config: {
        flags: {
          name: 'Test project',
          framework: 'Gatsby',
          environment: 'dev',
          'build-command': 'npm run build',
          'output-directory': './',
        },
        listOfFrameWorks: [
          { name: 'Gatsby', value: 'GATSBY' },
          { name: 'NextJs', value: 'NEXTJS' },
          { name: 'Other', value: 'OTHER' },
        ],
      },
    };
    let archiveMockData = { zipName: 'abc.zip', zipPath: 'path/to/zip', projectName: 'test' };
    beforeEach(function () {
      createSignedUploadUrlStub = stub(FileUpload.prototype, 'createSignedUploadUrl').resolves();
      archiveStub = stub(FileUpload.prototype, 'archive').resolves(archiveMockData);
      uploadFileStub = stub(FileUpload.prototype, 'uploadFile');
      uploadFileStub.withArgs(archiveMockData.zipName, archiveMockData.zipPath);
      selectOrgStub = stub(BaseClass.prototype, 'selectOrg').resolves();
      detectFrameworkStub = stub(BaseClass.prototype, 'detectFramework').resolves();
      handleEnvImportFlowStub = stub(BaseClass.prototype, 'handleEnvImportFlow').resolves();
    });
    afterEach(function () {
      createSignedUploadUrlStub.restore();
      archiveStub.restore();
      uploadFileStub.restore();
      selectOrgStub.restore();
      detectFrameworkStub.restore();
      handleEnvImportFlowStub.restore();
    });

    it('prepare for new project', async function () {
      await new FileUpload(adapterConstructorOptions).prepareForNewProjectCreation();
    });
  });

  describe('fileValidation', () => {
    let sandbox;
    let adapterConstructorOptions = {
      config: {
        projectBasePath: '/path/to/project',
      },
    };
    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should log a message and exit when package.json file does not exist', () => {
      const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(false);
      const exitStub = sandbox.stub(process, 'exit');

      const fileUploadInstance = new FileUpload(adapterConstructorOptions);

      fileUploadInstance.fileValidation();

      expect(existsSyncStub.calledOnceWithExactly('/path/to/project/package.json')).to.be.true;
      expect(exitStub.calledOnceWithExactly(1)).to.be.true;
    });

    it('should not log a message or exit when package.json file exists', () => {
      const existsSyncStub = sandbox.stub(fs, 'existsSync').returns(true);
      const exitStub = sandbox.stub(process, 'exit');

      const fileUploadInstance = new FileUpload(adapterConstructorOptions);

      fileUploadInstance.fileValidation();

      expect(existsSyncStub.calledOnceWithExactly('/path/to/project/package.json')).to.be.true;
      expect(exitStub.called).to.be.false;
    });
  });

  describe('createSignedUploadUrl', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should set the signed upload URL and upload UID in the config', async () => {
      const signedUploadUrl = 'http://example.com/upload';
      const apolloClientMock = {
        mutate: sandbox.stub().resolves({ data: { signedUploadUrl } }),
      };
      const logStub = sandbox.stub(console, 'log');
      const exitStub = sandbox.stub(process, 'exit');

      const fileUploadInstance = new FileUpload(adapterConstructorInputs);
      fileUploadInstance.apolloClient = apolloClientMock;
      fileUploadInstance.log = logStub;
      fileUploadInstance.exit = exitStub;
      fileUploadInstance.signedUploadUrlData = null;
      fileUploadInstance.config = { uploadUid: null };

      await fileUploadInstance.createSignedUploadUrl();

      expect(logStub.called).to.be.false;
      expect(exitStub.called).to.be.false;
      expect(fileUploadInstance.signedUploadUrlData).to.equal('http://example.com/upload');
    });
  });
});
