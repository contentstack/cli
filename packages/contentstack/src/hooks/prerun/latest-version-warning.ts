import { cliux, configHandler, HttpClient, handleAndLogError } from '@contentstack/cli-utilities';
import * as semver from 'semver';
import { IVersionUpgradeCache, IVersionUpgradeWarningFrequency } from '../../interfaces';

const versionUpgradeWarningFrequency: IVersionUpgradeWarningFrequency = {
  versionSyncDuration: 3 * 24 * 60 * 60 * 1000, // 3 days
};
export default async function (_opts): Promise<void> {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  let cache: IVersionUpgradeCache = { lastChecked: 0, lastWarnedDate: '', latestVersion: '' };

  // if CLI_VERSION is not set or is not the same as the current version, set it
  if (!configHandler.get('CLI_VERSION') || configHandler.get('CLI_VERSION') !== this.config.version) {
    configHandler.set('CLI_VERSION', this.config.version); // set current version in configHandler
  }

  if (!configHandler.get('versionUpgradeWarningFrequency')) {
    configHandler.set('versionUpgradeWarningFrequency', versionUpgradeWarningFrequency);
  }
  const versionUpgradeWarningFrequencyConfig: IVersionUpgradeWarningFrequency = configHandler.get(
    'versionUpgradeWarningFrequency',
  );

  // Load cache if it exists
  if (configHandler.get('versionUpgradeWarningCache')) {
    cache = configHandler.get('versionUpgradeWarningCache');
  }

  // Perform update check if needed
  const httpClient = new HttpClient();

  if (now - cache.lastChecked > versionUpgradeWarningFrequencyConfig.versionSyncDuration) {
    try {
      const latestVersion = (await httpClient.get(`https://registry.npmjs.org/@contentstack/cli/latest`))?.data
        ?.version;
      if (!latestVersion) {
        handleAndLogError(new Error('Failed to retrieve the latest version from the registry.'), { module: 'latest-version-warning' });
        return;
      }
      cache.latestVersion = latestVersion;
      cache.lastChecked = now;

      // Save updated cache
      configHandler.set('versionUpgradeWarningCache', cache);
    } catch (error) {
      handleAndLogError(error, { module: 'latest-version-warning' }, 'Failed to check the latest version');
      return;
    }
  }

  // Show warning if an update is available and last warning was yesterday
  if (semver.gt(cache.latestVersion, this.config.version) && cache.lastWarnedDate !== today) {
    cliux.print(
      `You are not using the most recent CLI release. Please update to the latest version for an improved experience.`,
      { color: 'yellow' },
    );
    // Update the last warned timestamp
    cache.lastWarnedDate = today;
    configHandler.set('versionUpgradeWarningCache', cache);
  }
}
