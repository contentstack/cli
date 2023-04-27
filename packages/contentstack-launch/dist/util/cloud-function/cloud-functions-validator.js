"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFunctionsValidator = void 0;
const cloud_function_errors_1 = require("./errors/cloud-function.errors");
class CloudFunctionsValidator {
    constructor(cloudFunctionResources) {
        this.cloudFunctionResources = cloudFunctionResources;
        this.dynamicRoutes = {};
    }
    validate() {
        for (const cloudFunctionResource of this.cloudFunctionResources) {
            const filepath = cloudFunctionResource.apiResourceURI;
            if (this.hasTopLevelDynamicRoute(filepath)) {
                return new cloud_function_errors_1.TopLevelDynamicRouteError(filepath);
            }
            if (this.hasInvalidFilepathNaming(filepath)) {
                return new cloud_function_errors_1.InvalidFilepathNamingError(filepath);
            }
            if (this.hasIndistinctDynamicRouteNamesInPath(filepath)) {
                return new cloud_function_errors_1.IndistinctDynamicRouteNamesInPathError(filepath);
            }
            const sameLevelDynamicRoute = this.getDynamicRouteAtSameLevel(filepath);
            if (sameLevelDynamicRoute) {
                return new cloud_function_errors_1.ExistingDynamicRouteAtSameLevelError(filepath, sameLevelDynamicRoute);
            }
        }
        return undefined;
    }
    hasTopLevelDynamicRoute(filepath) {
        const matchTopLevelDynamicRoute = /^\/\[(.*?)\].*$/;
        const matchResult = filepath.match(matchTopLevelDynamicRoute);
        return matchResult !== null;
    }
    hasInvalidFilepathNaming(filepath) {
        const validFilePathRegex = new RegExp('^(\\/[-a-z\\d%_.~+]*)*' + // path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$');
        const matchResult = filepath.match(validFilePathRegex);
        return matchResult === null;
    }
    hasIndistinctDynamicRouteNamesInPath(filepath) {
        const matchDistinctDynamicRoutesInPath = /\[(.*?)\]/g;
        const dynamicRouteNames = filepath.match(matchDistinctDynamicRoutesInPath);
        if (dynamicRouteNames === null) {
            return false;
        }
        const distinctDynamicRouteNames = Array.from(new Set(dynamicRouteNames));
        return distinctDynamicRouteNames.length !== dynamicRouteNames.length;
    }
    getDynamicRouteAtSameLevel(filepath) {
        const matchDyanmicRouteRegex = /\[(.*?)\]/g;
        const dynamicRouteNameReplacer = '[id]';
        const transformedFilePathWithDynamicRoute = filepath.replace(matchDyanmicRouteRegex, dynamicRouteNameReplacer);
        if (this.dynamicRoutes[transformedFilePathWithDynamicRoute]) {
            return this.dynamicRoutes[transformedFilePathWithDynamicRoute];
        }
        this.dynamicRoutes[transformedFilePathWithDynamicRoute] = filepath;
        return undefined;
    }
}
exports.CloudFunctionsValidator = CloudFunctionsValidator;
