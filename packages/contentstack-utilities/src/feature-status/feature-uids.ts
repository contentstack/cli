export const FEATURE = {
  ASSET_MANAGEMENT: 'amAssets',
  ASSET_SCANNING: 'assetsScan',
} as const;

export type FeatureUid = (typeof FEATURE)[keyof typeof FEATURE];
