import { CLOUD_FUNCTIONS_DIRECTORY } from '../constants';

enum CloudFunctionErrorTypes {
  TOP_LEVEL_DYNAMIC_ROUTE_ERROR = 'TopLevelDynamicRouteError',
  INVALID_FILEPATH_NAMING_ERROR = 'InvalidFilepathNamingError',
  INDISTINCT_DYNAMIC_ROUTE_NAMES_IN_PATH_ERROR = 'IndistinctDynamicRouteNamesInPathError',
  EXISTING_DYNAMIC_ROUTE_AT_SAME_LEVEL_ERROR = 'ExistingDynamicRouteAtSameLevelError',
  FUNCTIONS_DIRECTORY_NOT_FOUND = 'FunctionsDirectoryNotFound'
}

export class TopLevelDynamicRouteError extends Error {
  constructor(filepath: string) {
    // eslint-disable-next-line max-len
    super(`Top level dynamic route keys are not supported. Please move them to a sub directory Example: ${filepath} -> /api${filepath}`);
    this.name = CloudFunctionErrorTypes.TOP_LEVEL_DYNAMIC_ROUTE_ERROR;
  }
}

export class InvalidFilepathNamingError extends Error {
  constructor(filepath: string) {
    // eslint-disable-next-line max-len
    super(`Rename: ${filepath}. Only alphanumeric characters, hyphens, underscores and [param] should be used in the naming of function and its parent directory.`);
    this.name = CloudFunctionErrorTypes.INVALID_FILEPATH_NAMING_ERROR;
  }
}

export class IndistinctDynamicRouteNamesInPathError extends Error {
  constructor(filepath: string) {
    super(`Error while parsing: ${filepath}. Param keys should be unique within a function path.`);
    this.name = CloudFunctionErrorTypes.INDISTINCT_DYNAMIC_ROUTE_NAMES_IN_PATH_ERROR;
  }
}

export class ExistingDynamicRouteAtSameLevelError extends Error {
  constructor(filepath: string, conflictingFilepath: string) {
    super(`The path '${filepath}' conflicts with '${conflictingFilepath}' on the same hierarchical level.`);
    this.name = CloudFunctionErrorTypes.EXISTING_DYNAMIC_ROUTE_AT_SAME_LEVEL_ERROR;
  }
}
export class FunctionsDirectoryNotFoundError extends Error {
  constructor(sourceDirectoryPath: string) {
    super(`No ${CLOUD_FUNCTIONS_DIRECTORY} directory found at '${sourceDirectoryPath}'.`);
    this.name = CloudFunctionErrorTypes.FUNCTIONS_DIRECTORY_NOT_FOUND;
  }
}
