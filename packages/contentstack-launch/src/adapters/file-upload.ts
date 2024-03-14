import AdmZip from 'adm-zip';
import map from 'lodash/map';
import omit from 'lodash/omit';
import find from 'lodash/find';
import FormData from 'form-data';
import filter from 'lodash/filter';
import includes from 'lodash/includes';
import { basename, resolve } from 'path';
import { cliux, ux } from '@contentstack/cli-utilities';
import { createReadStream, existsSync, PathLike, statSync } from 'fs';

import { print } from '../util';
import BaseClass from './base-class';
import { getFileList } from '../util/fs';
import { createSignedUploadUrlMutation, importProjectMutation } from '../graphql';

export default class FileUpload extends BaseClass {
  private signedUploadUrlData!: Record<string, any>;

  /**
   * @method run
   *
   * @return {*}  {Promise<void>}
   * @memberof FileUpload
   */
  async run(): Promise<void> {
    if (this.config.isExistingProject) {
      await this.initApolloClient();
      if (
        !(await cliux.inquire({
          type: 'confirm',
          default: false,
          name: 'uploadLastFile',
          message: 'Redeploy with last file upload?',
        }))
      ) {
        await this.createSignedUploadUrl();
        const { zipName, zipPath } = await this.archive();
        await this.uploadFile(zipName, zipPath);
      }

      const { uploadUid } = this.signedUploadUrlData || {
        uploadUid: undefined,
      };
      await this.createNewDeployment(true, uploadUid);
    } else {
      await this.prepareForNewProjectCreation();
      await this.createNewProject();
    }

    this.prepareLaunchConfig();
    await this.showLogs();
    this.showDeploymentUrl();
    this.showSuggestion();
  }

  /**
   * @method createNewProject - Create new launch project
   *
   * @return {*}  {Promise<void>}
   * @memberof FileUpload
   */
  async createNewProject(): Promise<void> {
    const { framework, projectName, buildCommand, outputDirectory, environmentName } = this.config;

    await this.apolloClient
      .mutate({
        mutation: importProjectMutation,
        variables: {
          project: {
            projectType: 'FILEUPLOAD',
            name: projectName,
            fileUpload: { uploadUid: this.signedUploadUrlData.uploadUid },
            environment: {
              frameworkPreset: framework,
              outputDirectory: outputDirectory,
              name: environmentName || 'Default',
              environmentVariables: map(this.envVariables, ({ key, value }) => ({ key, value })),
              buildCommand: buildCommand === undefined || buildCommand === null ? 'npm run build' : buildCommand,
            },
          },
          skipGitData: true,
        },
      })
      .then(({ data: { project } }) => {
        this.log('New project created successfully', 'info');
        const [firstEnvironment] = project.environments;
        this.config.currentConfig = project;
        this.config.currentConfig.deployments = map(firstEnvironment.deployments.edges, 'node');
        this.config.currentConfig.environments[0] = omit(this.config.currentConfig.environments[0], ['deployments']);
      })
      .catch(async (error) => {
        const canRetry = await this.handleNewProjectCreationError(error);

        if (canRetry) {
          return this.createNewProject();
        }
      });
  }

  /**
   * @method prepareForNewProjectCreation - prepare necessary data for new project creation
   *
   * @return {*}  {Promise<void>}
   * @memberof FileUpload
   */
  async prepareForNewProjectCreation(): Promise<void> {
    const {
      name,
      framework,
      environment,
      'build-command': buildCommand,
      'output-directory': outputDirectory,
    } = this.config.flags;

    // this.fileValidation();
    await this.selectOrg();
    await this.createSignedUploadUrl();
    const { zipName, zipPath, projectName } = await this.archive();
    await this.uploadFile(zipName, zipPath);
    this.config.projectName =
      name ||
      (await cliux.inquire({
        type: 'input',
        name: 'projectName',
        message: 'Project Name',
        default: projectName,
        validate: this.inquireRequireValidation,
      }));
    this.config.environmentName =
      environment ||
      (await cliux.inquire({
        type: 'input',
        default: 'Default',
        name: 'environmentName',
        message: 'Environment Name',
        validate: this.inquireRequireValidation,
      }));
    if (framework) {
      this.config.framework = ((
        find(this.config.listOfFrameWorks, {
          name: framework,
        }) as Record<string, any>
      ).value || '') as string;
      print([
        { message: '?', color: 'green' },
        { message: 'Framework Preset', bold: true },
        { message: this.config.framework, color: 'cyan' },
      ]);
    } else {
      await this.detectFramework();
    }
    this.config.buildCommand =
      buildCommand ||
      (await cliux.inquire({
        type: 'input',
        name: 'buildCommand',
        message: 'Build Command',
        default: this.config.framework === 'OTHER' ? null : 'npm run build',
      }));
    this.config.outputDirectory =
      outputDirectory ||
      (await cliux.inquire({
        type: 'input',
        name: 'outputDirectory',
        message: 'Output Directory',
        default: (this.config.outputDirectories as Record<string, string>)[this.config?.framework || 'OTHER'],
      }));
    await this.handleEnvImportFlow();
  }

  /**
   * @method fileValidation - validate the working directory
   *
   * @memberof FileUpload
   */
  fileValidation() {
    const basePath = this.config.projectBasePath;
    const packageJsonPath = resolve(basePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      this.log('Package.json file not found.', 'info');
      this.exit(1);
    }
  }

  /**
   * @method archive - Archive the files and directory to be uploaded for launch project
   *
   * @return {*}
   * @memberof FileUpload
   */
  async archive() {
    ux.action.start('Preparing zip file');
    const projectName = basename(this.config.projectBasePath);
    const zipName = `${Date.now()}_${projectName}.zip`;
    const zipPath = resolve(this.config.projectBasePath, zipName);
    const zip = new AdmZip();
    const zipEntries = filter(
      await getFileList(this.config.projectBasePath, true, true),
      (entry) => !includes(this.config.fileUploadConfig.exclude, entry) && !includes(entry, '.zip'),
    );

    for (const entry of zipEntries) {
      const entryPath = `${this.config.projectBasePath}/${entry}`;
      const state = statSync(entryPath);

      switch (true) {
        case state.isDirectory(): // NOTE folder
          await zip.addLocalFolderPromise(entryPath, { zipPath: entry });
          break;
        case state.isFile(): // NOTE check is file
          zip.addLocalFile(entryPath);
          break;
      }
    }

    const status = await zip.writeZipPromise(zipPath).catch(() => {
      this.log('Zipping project process failed! Please try again.');
      this.exit(1);
    });

    if (!status) {
      this.log('Zipping project process failed! Please try again.');
      this.exit(1);
    }

    ux.action.stop();
    return { zipName, zipPath, projectName };
  }

  /**
   * @method createSignedUploadUrl - create pre signed url for file upload
   *
   * @return {*}  {Promise<void>}
   * @memberof FileUpload
   */
  async createSignedUploadUrl(): Promise<void> {
    this.signedUploadUrlData = await this.apolloClient
      .mutate({ mutation: createSignedUploadUrlMutation })
      .then(({ data: { signedUploadUrl } }) => signedUploadUrl)
      .catch((error) => {
        this.log('Something went wrong. Please try again.', 'warn');
        this.log(error, 'error');
        this.exit(1);
      });
    this.config.uploadUid = this.signedUploadUrlData.uploadUid;
  }

  /**
   * @method uploadFile - Upload file in to s3 bucket
   *
   * @param {string} fileName
   * @param {PathLike} filePath
   * @return {*}  {Promise<void>}
   * @memberof FileUpload
   */
  async uploadFile(fileName: string, filePath: PathLike): Promise<void> {
    const { uploadUrl, fields } = this.signedUploadUrlData;
    const formData = new FormData();

    for (const { formFieldKey, formFieldValue } of fields) {
      formData.append(formFieldKey, formFieldValue);
    }

    formData.append('file', createReadStream(filePath) as any, fileName);

    await new Promise<void>((resolve) => {
      ux.action.start('Starting file upload...');
      formData.submit(uploadUrl, (error, res) => {
        if (error) {
          ux.action.stop('File upload failed!');
          this.log('File upload failed. Please try again.', 'error');
          this.log(error, 'error');
          this.exit(1);
        }

        resolve();
        ux.action.stop();
      });
    });
  }
}
