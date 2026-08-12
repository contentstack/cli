import { getContentstackEndpoint } from '@contentstack/utils';

export interface RegionEndpoints {
  [key: string]: string;
}

export interface CanonicalRegion {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
  developerHubUrl: string;
  launchHubUrl: string;
  personalizeUrl: string;
  composableStudioUrl: string;
  csAssetsUrl?: string;
  endpoints: RegionEndpoints;
}

/**
 * Resolve the canonical endpoint set for a region name/alias via @contentstack/utils.
 * Returns null when the name isn't a recognized region (e.g. a custom region name).
 */
export function resolveCanonicalEndpoints(name: string): RegionEndpoints | null {
  try {
    const endpoints = getContentstackEndpoint(name) as unknown;
    if (!endpoints || typeof endpoints === 'string') return null;
    return endpoints as RegionEndpoints;
  } catch {
    return null;
  }
}

/**
 * Build a region object from a raw endpoints map, keeping the existing named
 * fields (cma/cda/uiHost/...) plus a full raw `endpoints` passthrough so any
 * future endpoint Contentstack adds is available without further code changes.
 */
export function buildRegionFromEndpoints(name: string, endpoints: RegionEndpoints): CanonicalRegion {
  return {
    name,
    cma: endpoints.contentManagement,
    cda: endpoints.contentDelivery,
    uiHost: endpoints.application,
    developerHubUrl: endpoints.developerHub,
    launchHubUrl: endpoints.launch,
    personalizeUrl: endpoints.personalizeManagement,
    composableStudioUrl: endpoints.composableStudio,
    csAssetsUrl: endpoints.assetManagement,
    endpoints,
  };
}
