"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFunctions = void 0;
const tslib_1 = require("tslib");
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const esm_1 = tslib_1.__importDefault(require("esm"));
const express_1 = tslib_1.__importDefault(require("express"));
const path_1 = tslib_1.__importStar(require("path"));
const cloud_functions_validator_1 = require("./cloud-functions-validator");
const constants_1 = require("./constants");
const cloud_function_errors_1 = require("./errors/cloud-function.errors");
const os_helper_1 = require("./os-helper");
class CloudFunctions {
    constructor(pathToSourceCode) {
        this.cloudFunctionsDirectoryPath = path_1.default.join(pathToSourceCode.replace(/^(\.\.(\/|\\|$))+/, ""), constants_1.CLOUD_FUNCTIONS_DIRECTORY);
        this.pathToSourceCode = pathToSourceCode;
    }
    async serve(servingPort) {
        const directoryExists = (0, os_helper_1.checkIfDirectoryExists)(this.cloudFunctionsDirectoryPath);
        if (!directoryExists) {
            throw new cloud_function_errors_1.FunctionsDirectoryNotFoundError(this.pathToSourceCode);
        }
        const cloudFunctionResources = await this.parseCloudFunctionResources();
        const hasCloudFunctionResources = cloudFunctionResources.length;
        if (!hasCloudFunctionResources) {
            console.log("No Serverless functions detected.");
            process.exit(0);
        }
        const cloudFunctionsValidator = new cloud_functions_validator_1.CloudFunctionsValidator(cloudFunctionResources);
        const error = cloudFunctionsValidator.validate();
        if (error) {
            throw error;
        }
        const { exactRouteResources, dynamicRouteResources } = this.transformAndSegregateResourcesByRoutes(cloudFunctionResources);
        const app = (0, express_1.default)();
        await this.applyAppRouter(exactRouteResources, app);
        await this.applyAppRouter(dynamicRouteResources, app);
        dotenv_1.default.config({ path: path_1.default.join(this.pathToSourceCode, constants_1.ENV_FILE_NAME) });
        app.listen(servingPort, () => {
            console.log(`Serving on port ${servingPort}`);
        });
    }
    async applyAppRouter(cloudFunctionResources, app) {
        const loadAsESM = (0, esm_1.default)(module);
        await Promise.all(cloudFunctionResources.map(async (cloudFunctionResource) => {
            const handler = loadAsESM(`${cloudFunctionResource.cloudFunctionFilePath}`).default;
            app.all(cloudFunctionResource.apiResourceURI, async (request, response) => {
                try {
                    return await handler(request, response);
                }
                catch (error) {
                    console.error(error);
                    response.status(500).send();
                }
            });
        }));
    }
    async parseCloudFunctionResources() {
        const filePaths = await (0, os_helper_1.walkFileSystem)(this.cloudFunctionsDirectoryPath);
        const cloudFunctionResources = [];
        for await (const filePath of filePaths) {
            const parsedPath = path_1.default.parse(filePath);
            if (parsedPath.ext !== constants_1.CLOUD_FUNCTIONS_SUPPORTED_EXTENSION ||
                !(await this.checkDefaultExport(filePath))) {
                continue;
            }
            const relativeParsedPath = path_1.default.parse(path_1.default.relative(this.cloudFunctionsDirectoryPath, filePath));
            const apiResourceURI = `/${path_1.default.join(relativeParsedPath.dir, relativeParsedPath.name)}`;
            cloudFunctionResources.push({
                cloudFunctionFilePath: filePath,
                apiResourceURI,
            });
        }
        return cloudFunctionResources;
    }
    transformAndSegregateResourcesByRoutes(cloudFunctionResources) {
        const matchDyanmicRouteRegex = /\[(.*?)\]/g;
        const exactRouteResources = [];
        const dynamicRouteResources = [];
        if (cloudFunctionResources.length) {
            console.log("Detected Serverless functions...");
        }
        cloudFunctionResources.forEach((cloudFunctionResource) => {
            if (cloudFunctionResource.apiResourceURI.match(matchDyanmicRouteRegex) !==
                null) {
                const apiResourceURI = cloudFunctionResource.apiResourceURI.replace(matchDyanmicRouteRegex, ":$1");
                dynamicRouteResources.push({
                    ...cloudFunctionResource,
                    apiResourceURI,
                });
                console.log(`λ ${apiResourceURI} \n`);
            }
            else {
                exactRouteResources.push(cloudFunctionResource);
                console.log(`λ ${cloudFunctionResource.apiResourceURI} \n`);
            }
        });
        return { exactRouteResources, dynamicRouteResources };
    }
    async checkDefaultExport(filepath) {
        const exportType = "function";
        const loadAsESM = (0, esm_1.default)(module);
        const fullPath = (0, path_1.normalize)(path_1.default.resolve(process.cwd(), filepath)).replace(/^(\.\.(\/|\\|$))+/, "");
        const handler = await loadAsESM(fullPath);
        return typeof handler.default === exportType;
    }
}
exports.CloudFunctions = CloudFunctions;
