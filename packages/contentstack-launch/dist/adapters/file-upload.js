"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const adm_zip_1 = tslib_1.__importDefault(require("adm-zip"));
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const omit_1 = tslib_1.__importDefault(require("lodash/omit"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const form_data_1 = tslib_1.__importDefault(require("form-data"));
const filter_1 = tslib_1.__importDefault(require("lodash/filter"));
const path_1 = require("path");
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const fs_1 = require("fs");
const util_1 = require("../util");
const base_class_1 = tslib_1.__importDefault(require("./base-class"));
const fs_2 = require("../util/fs");
const graphql_1 = require("../graphql");
class FileUpload extends base_class_1.default {
    constructor(options) {
        super(options);
    }
    /**
     * @method run
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    async run() {
        if (this.config.isExistingProject) {
            await this.initApolloClient();
            if (!(await cli_utilities_1.cliux.inquire({
                type: "confirm",
                default: false,
                name: "uploadLastFile",
                message: "Redeploy with last file upload?",
            }))) {
                await this.createSignedUploadUrl();
                const { zipName, zipPath } = await this.archive();
                await this.uploadFile(zipName, zipPath);
            }
            const { uploadUid } = this.signedUploadUrlData || {
                uploadUid: undefined,
            };
            await this.createNewDeployment(true, uploadUid);
        }
        else {
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
    async createNewProject() {
        const { framework, projectName, buildCommand, selectedStack, outputDirectory, environmentName, } = this.config;
        await this.apolloClient
            .mutate({
            mutation: graphql_1.importProjectMutation,
            variables: {
                project: {
                    projectType: "FILEUPLOAD",
                    name: projectName,
                    cmsStackApiKey: selectedStack === null || selectedStack === void 0 ? void 0 : selectedStack.api_key,
                    fileUpload: { uploadUid: this.signedUploadUrlData.uploadUid },
                    environment: {
                        frameworkPreset: framework,
                        outputDirectory: outputDirectory,
                        name: environmentName || "Default",
                        buildCommand: buildCommand || "npm run build",
                        environmentVariables: (0, map_1.default)(this.envVariables, ({ key, value }) => ({ key, value })),
                    },
                },
                skipGitData: true,
            },
        })
            .then(({ data: { project } }) => {
            this.log("New project created successfully", "info");
            const [firstEnvironment] = project.environments;
            this.config.currentConfig = project;
            this.config.currentConfig.deployments = (0, map_1.default)(firstEnvironment.deployments.edges, "node");
            this.config.currentConfig.environments[0] = (0, omit_1.default)(this.config.currentConfig.environments[0], ["deployments"]);
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
    async prepareForNewProjectCreation() {
        var _a;
        const { name, framework, environment, "build-command": buildCommand, "output-directory": outputDirectory, } = this.config.flags;
        this.fileValidation();
        await this.selectOrg();
        await this.createSignedUploadUrl();
        const { zipName, zipPath, projectName } = await this.archive();
        await this.uploadFile(zipName, zipPath);
        this.config.projectName =
            name ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    name: "projectName",
                    message: "Project Name",
                    default: projectName,
                    validate: this.inquireRequireValidation,
                }));
        this.config.environmentName =
            environment ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    default: "Default",
                    name: "environmentName",
                    message: "Environment Name",
                    validate: this.inquireRequireValidation,
                }));
        if (framework) {
            this.config.framework = (0, find_1.default)(this.config.listOfFrameWorks, {
                name: framework,
            }).value;
            (0, util_1.print)([
                { message: "?", color: "green" },
                { message: "Framework Preset", bold: true },
                { message: this.config.framework, color: "cyan" },
            ]);
        }
        else {
            await this.detectFramework();
        }
        this.config.buildCommand =
            buildCommand ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    default: "npm run build",
                    name: "buildCommand",
                    message: "Build Command",
                    validate: this.inquireRequireValidation,
                }));
        this.config.outputDirectory =
            outputDirectory ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    name: "outputDirectory",
                    message: "Output Directory",
                    default: this.config.outputDirectories[((_a = this.config) === null || _a === void 0 ? void 0 : _a.framework) || "OTHER"],
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
        const packageJsonPath = (0, path_1.join)(basePath, "package.json");
        if (!(0, fs_1.existsSync)(packageJsonPath)) {
            this.log("Package.json file not found.", "info");
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
        cli_utilities_1.ux.action.start("Preparing zip file");
        const projectName = (0, path_1.basename)(this.config.projectBasePath);
        const zipName = `${Date.now()}_${projectName}.zip`;
        const zipPath = (0, path_1.join)(this.config.projectBasePath, zipName);
        const zip = new adm_zip_1.default();
        const zipEntries = (0, filter_1.default)(await (0, fs_2.getFileList)(this.config.projectBasePath, true, true), (entry) => !(0, includes_1.default)(this.config.fileUploadConfig.exclude, entry) &&
            !(0, includes_1.default)(entry, ".zip"));
        for (const entry of zipEntries) {
            const entryPath = `${this.config.projectBasePath}/${entry}`;
            const state = (0, fs_1.statSync)(entryPath);
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
            this.log("Zipping project process failed! Please try again.");
            this.exit(1);
        });
        if (!status) {
            this.log("Zipping project process failed! Please try again.");
            this.exit(1);
        }
        cli_utilities_1.ux.action.stop();
        return { zipName, zipPath, projectName };
    }
    /**
     * @method createSignedUploadUrl - create pre signed url for file upload
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    async createSignedUploadUrl() {
        this.signedUploadUrlData = await this.apolloClient
            .mutate({ mutation: graphql_1.createSignedUploadUrlMutation })
            .then(({ data: { signedUploadUrl } }) => signedUploadUrl)
            .catch((error) => {
            this.log("Something went wrong. Please try again.", "warn");
            this.log(error, "error");
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
    async uploadFile(fileName, filePath) {
        const { uploadUrl, fields } = this.signedUploadUrlData;
        const formData = new form_data_1.default();
        for (const { formFieldKey, formFieldValue } of fields) {
            formData.append(formFieldKey, formFieldValue);
        }
        formData.append("file", (0, fs_1.createReadStream)(filePath), fileName);
        await new Promise((resolve) => {
            cli_utilities_1.ux.action.start("Starting file upload...");
            formData.submit(uploadUrl, (error, res) => {
                if (error) {
                    cli_utilities_1.ux.action.stop("File upload failed!");
                    this.log("File upload failed. Please try again.", "error");
                    this.log(error, "error");
                    this.exit(1);
                }
                resolve();
                cli_utilities_1.ux.action.stop();
            });
        });
    }
}
exports.default = FileUpload;
