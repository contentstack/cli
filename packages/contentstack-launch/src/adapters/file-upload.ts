import AdmZip from 'adm-zip';
import map from 'lodash/map';
import omit from 'lodash/omit';
import find from 'lodash/find';
import FormData from 'form-data';
import filter from 'lodash/filter';
import includes from 'lodash/includes';
import isEmpty from 'lodash/isEmpty';
import { basename, resolve } from 'path';
import { cliux, configHandler, HttpClient, ux } from '@contentstack/cli-utilities';
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
      'out-dir': outputDirectory,
      'variable-type': variableType,
      'env-variables': envVariables,
      alias,
    } = this.config.flags;
    const { token, apiKey } = configHandler.get(`tokens.${alias}`) ?? {};
    this.config.selectedStack = apiKey;
    this.config.deliveryToken = token;
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
    this.config.variableType = variableType as unknown as string;
    this.config.envVariables = envVariables;
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
    const { uploadUrl, fields, headers } = this.signedUploadUrlData;
    const formData = new FormData();

    if (!isEmpty(fields)) {
      for (const { formFieldKey, formFieldValue } of fields) {
        formData.append(formFieldKey, formFieldValue);
      }

      formData.append('file', createReadStream(filePath), fileName);
      await this.submitFormData(formData, uploadUrl);
    } else if (!isEmpty(headers)) {
      await this.uploadWithHttpClient(filePath, uploadUrl, headers, fileName);
    }
  }

  private async submitFormData(formData: FormData, uploadUrl: string): Promise<void> {
    ux.action.start('Starting file upload...');
    try {
      await new Promise<void>((resolve, reject) => {
        formData.submit(uploadUrl, (error, res) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      ux.action.stop();
    } catch (error) {
      ux.action.stop('File upload failed!');
      this.log('File upload failed. Please try again.', 'error');
      if (error instanceof Error) {
        this.log(error.message, 'error');
      }
      this.exit(1);
    }
  }

  private async uploadWithHttpClient(
    filePath: PathLike,
    uploadUrl: string,
    headers: Array<{ key: string; value: string }>,
    fileName: string,
  ): Promise<void> {
    ux.action.start('Starting file upload...');
    const httpClient = new HttpClient();
    const form = new FormData();
    form.append('file', createReadStream(filePath), fileName);

    // Convert headers array to a headers object
    const headerObject = headers.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    try {
      const response = await httpClient.headers(headerObject).put(uploadUrl, form);
      const { status } = response;

      if (status >= 200 && status < 300) {
        ux.action.stop();
      } else {
        ux.action.stop('File upload failed!');
        this.log('File upload failed. Please try again.', 'error');
        this.exit(1);
      }
    } catch (error) {
      ux.action.stop('File upload failed!');
      this.log('File upload failed. Please try again.', 'error');
      if (error instanceof Error) {
        this.log(`Error: ${error.message}`, 'error');
      }
      this.exit(1);
    }
  }
}
