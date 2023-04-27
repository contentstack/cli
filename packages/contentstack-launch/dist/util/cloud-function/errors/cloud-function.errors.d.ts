export declare class TopLevelDynamicRouteError extends Error {
    constructor(filepath: string);
}
export declare class InvalidFilepathNamingError extends Error {
    constructor(filepath: string);
}
export declare class IndistinctDynamicRouteNamesInPathError extends Error {
    constructor(filepath: string);
}
export declare class ExistingDynamicRouteAtSameLevelError extends Error {
    constructor(filepath: string, conflictingFilepath: string);
}
export declare class FunctionsDirectoryNotFoundError extends Error {
    constructor(sourceDirectoryPath: string);
}
