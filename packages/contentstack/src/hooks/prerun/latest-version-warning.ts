import { cliux, configHandler, HttpClient, LoggerService } from '@contentstack/cli-utilities';
import * as semver from 'semver';
import { IVersionUpgradeCache, IVersionUpgradeWarningFrequency } from '../../interfaces';

const versionUpgradeWarningFrequency: IVersionUpgradeWarningFrequency = {
  versionSyncDuration: 3 * 24 * 60 * 60 * 1000,
};
export default async function (_opts): Promise<void> {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  const logger: LoggerService = new LoggerService(process.env.CS_CLI_LOG_PATH || process.cwd(), 'cli-log');
  let cache: IVersionUpgradeCache = { lastChecked: 0, lastWarnedDate: '', latestVersion: '' };

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
        logger.error('Failed to retrieve the latest version from the registry.');
        return;
      }
      cache.latestVersion = latestVersion;
      cache.lastChecked = now;

      // Save updated cache
      configHandler.set('versionUpgradeWarningCache', cache);
    } catch (error) {
      logger.error('Failed to check the latest version', error);
      return;
    }
  }

  // Show warning if an update is available and last warning was yesterday
  if (semver.gt(cache.latestVersion, this.config.version) && cache.lastWarnedDate !== today) {
    cliux.print(
      `You are using version ${this.config.version}, but the latest version is ${cache.latestVersion}. Please update your CLI for the best experience.`,
      { color: 'yellow' },
    );
    // Update the last warned timestamp
    cache.lastWarnedDate = today;
    configHandler.set('versionUpgradeWarningCache', cache);
  }
}
