export const FEATURE = {
  ASSET_MANAGEMENT: 'amAssets',
  // ASSET_SCANNING: 'asset_scanning', // uncomment when uid confirmed with platform team
} as const;

export type FeatureUid = typeof FEATURE[keyof typeof FEATURE];
