import { refreshRegionEndpoints } from '@contentstack/cli-utilities';

/**
 * Silently backfills the persisted region config with any endpoint fields
 * missing from an older CLI version (e.g. authUrl), before any command runs.
 */
export default function (): void {
  try {
    refreshRegionEndpoints();
  } catch {
    // never block CLI startup on region refresh
  }
}
