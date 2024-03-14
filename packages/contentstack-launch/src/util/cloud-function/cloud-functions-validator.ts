import {
  ExistingDynamicRouteAtSameLevelError,
  IndistinctDynamicRouteNamesInPathError,
  InvalidFilepathNamingError,
  TopLevelDynamicRouteError,
} from './errors/cloud-function.errors';
import { CloudFunctionResource, CloudFunctionValidationError } from './types';

export class CloudFunctionsValidator {
  private cloudFunctionResources: CloudFunctionResource[];
  private dynamicRoutes: Record<string, string>;

  constructor(cloudFunctionResources: CloudFunctionResource[]) {
    this.cloudFunctionResources = cloudFunctionResources;
    this.dynamicRoutes = {};
  }

  validate(): CloudFunctionValidationError | undefined {
    for (const cloudFunctionResource of this.cloudFunctionResources) {
      const filepath = cloudFunctionResource.apiResourceURI;

      if (this.hasTopLevelDynamicRoute(filepath)) {
        return new TopLevelDynamicRouteError(filepath);
      }

      if (this.hasInvalidFilepathNaming(filepath)) {
        return new InvalidFilepathNamingError(filepath);
      }

      if (this.hasIndistinctDynamicRouteNamesInPath(filepath)) {
        return new IndistinctDynamicRouteNamesInPathError(filepath);
      }

      const sameLevelDynamicRoute = this.getDynamicRouteAtSameLevel(filepath);
      if (sameLevelDynamicRoute) {
        return new ExistingDynamicRouteAtSameLevelError(filepath, sameLevelDynamicRoute);
      }
    }

    return undefined;
  }

  private hasTopLevelDynamicRoute(filepath: string): boolean {
    const matchTopLevelDynamicRoute = /^\/\[(.*?)\].*$/;

    const matchResult = filepath.match(matchTopLevelDynamicRoute);
    return matchResult !== null;
  }

  private hasInvalidFilepathNaming(filepath: string): boolean {
    const validFilePathRegex = new RegExp(
      '^(\\/[-a-z\\d%_.~+]*)*' + // path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
    );

    const matchResult = filepath.match(validFilePathRegex);
    return matchResult === null;
  }

  private hasIndistinctDynamicRouteNamesInPath(filepath: string): boolean {
    const matchDistinctDynamicRoutesInPath = /\[(.*?)\]/g;
    const dynamicRouteNames = filepath.match(matchDistinctDynamicRoutesInPath) as string[];

    if (dynamicRouteNames === null) {
      return false;
    }

    const distinctDynamicRouteNames = Array.from(new Set(dynamicRouteNames));
    return distinctDynamicRouteNames.length !== dynamicRouteNames.length;
  }

  private getDynamicRouteAtSameLevel(filepath: string): string | undefined {
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