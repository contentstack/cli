"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionsDirectoryNotFoundError = exports.ExistingDynamicRouteAtSameLevelError = exports.IndistinctDynamicRouteNamesInPathError = exports.InvalidFilepathNamingError = exports.TopLevelDynamicRouteError = void 0;
const constants_1 = require("../constants");
var CloudFunctionErrorTypes;
(function (CloudFunctionErrorTypes) {
    CloudFunctionErrorTypes["TOP_LEVEL_DYNAMIC_ROUTE_ERROR"] = "TopLevelDynamicRouteError";
    CloudFunctionErrorTypes["INVALID_FILEPATH_NAMING_ERROR"] = "InvalidFilepathNamingError";
    CloudFunctionErrorTypes["INDISTINCT_DYNAMIC_ROUTE_NAMES_IN_PATH_ERROR"] = "IndistinctDynamicRouteNamesInPathError";
    CloudFunctionErrorTypes["EXISTING_DYNAMIC_ROUTE_AT_SAME_LEVEL_ERROR"] = "ExistingDynamicRouteAtSameLevelError";
    CloudFunctionErrorTypes["FUNCTIONS_DIRECTORY_NOT_FOUND"] = "FunctionsDirectoryNotFound";
})(CloudFunctionErrorTypes || (CloudFunctionErrorTypes = {}));
class TopLevelDynamicRouteError extends Error {
    constructor(filepath) {
        // eslint-disable-next-line max-len
        super(`Top level dynamic route keys are not supported. Please move them to a sub directory Example: ${filepath} -> /api${filepath}`);
        this.name = CloudFunctionErrorTypes.TOP_LEVEL_DYNAMIC_ROUTE_ERROR;
    }
}
exports.TopLevelDynamicRouteError = TopLevelDynamicRouteError;
class InvalidFilepathNamingError extends Error {
    constructor(filepath) {
        // eslint-disable-next-line max-len
        super(`Rename: ${filepath}. Only alphanumeric characters, hyphens, underscores and [param] should be used in the naming of function and its parent directory.`);
        this.name = CloudFunctionErrorTypes.INVALID_FILEPATH_NAMING_ERROR;
    }
}
exports.InvalidFilepathNamingError = InvalidFilepathNamingError;
class IndistinctDynamicRouteNamesInPathError extends Error {
    constructor(filepath) {
        super(`Error while parsing: ${filepath}. Param keys should be unique within a function path.`);
        this.name = CloudFunctionErrorTypes.INDISTINCT_DYNAMIC_ROUTE_NAMES_IN_PATH_ERROR;
    }
}
exports.IndistinctDynamicRouteNamesInPathError = IndistinctDynamicRouteNamesInPathError;
class ExistingDynamicRouteAtSameLevelError extends Error {
    constructor(filepath, conflictingFilepath) {
        super(`The path '${filepath}' conflicts with '${conflictingFilepath}' on the same hierarchical level.`);
        this.name = CloudFunctionErrorTypes.EXISTING_DYNAMIC_ROUTE_AT_SAME_LEVEL_ERROR;
    }
}
exports.ExistingDynamicRouteAtSameLevelError = ExistingDynamicRouteAtSameLevelError;
class FunctionsDirectoryNotFoundError extends Error {
    constructor(sourceDirectoryPath) {
        super(`No ${constants_1.CLOUD_FUNCTIONS_DIRECTORY} directory found at '${sourceDirectoryPath}'.`);
        this.name = CloudFunctionErrorTypes.FUNCTIONS_DIRECTORY_NOT_FOUND;
    }
}
exports.FunctionsDirectoryNotFoundError = FunctionsDirectoryNotFoundError;
