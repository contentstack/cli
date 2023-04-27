import { CloudFunctionResource, CloudFunctionValidationError } from './types';
export declare class CloudFunctionsValidator {
    private cloudFunctionResources;
    private dynamicRoutes;
    constructor(cloudFunctionResources: CloudFunctionResource[]);
    validate(): CloudFunctionValidationError | undefined;
    private hasTopLevelDynamicRoute;
    private hasInvalidFilepathNaming;
    private hasIndistinctDynamicRouteNamesInPath;
    private getDynamicRouteAtSameLevel;
}
