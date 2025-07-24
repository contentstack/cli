import Conf from 'conf';
import has from 'lodash/has';
import { v4 as uuid } from 'uuid';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import chalk from 'chalk';
import { cliux } from '.';

const ENC_KEY = process.env.ENC_KEY || 'encryptionKey';
const ENCRYPT_CONF: boolean = has(process.env, 'ENCRYPT_CONF') ? process.env.ENCRYPT_CONF === 'true' : true;
const CONFIG_NAME = process.env.CONFIG_NAME || 'contentstack_cli';
const ENC_CONFIG_NAME = process.env.ENC_CONFIG_NAME || 'contentstack_cli_obfuscate';
const OLD_CONFIG_BACKUP_FLAG = 'isOldConfigBackup';

const xdgBasedir = require('xdg-basedir');
const path = require('path');
const os = require('os');
const uniqueString = require('unique-string');
const oldConfigDirectory = xdgBasedir.config || path.join(os.tmpdir(), uniqueString());
const pathPrefix = path.join('configstore', `${CONFIG_NAME}.json`);
const oldConfigPath = path.join(oldConfigDirectory, pathPrefix);

const cwd = process.env.CS_CLI_CONFIG_PATH;

/**
 * Config class implementing lazy initialization pattern.
 * The configuration is not initialized when the module is imported,
 * but only when it's actually needed (when get/set/delete methods are called).
 * This prevents unnecessary initialization in plugins that import but don't use the config.
 */
class Config {
  private config: Conf | null = null;
  private static instance: Config;

  private constructor() {}

  /**
   * Gets the singleton instance of Config.
   * Note: This doesn't initialize the config yet - initialization happens on first use.
   */
  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * Initializes the configuration only if it hasn't been initialized yet.
   * This lazy initialization pattern prevents unnecessary config operations
   * when the module is imported but not used.
   */
  private initializeIfNeeded(): void {
    if (this.config) return;
    
    this.config = ENCRYPT_CONF === true ? this.getEncryptedConfig() : this.getDecryptedConfig();
    this.importOldConfig();
  }

  private importOldConfig() {
    if (!this.get(OLD_CONFIG_BACKUP_FLAG)) {
      try {
        const oldConfigStoreData = this.getOldConfig();
        if (oldConfigStoreData) {
          this.setOldConfigStoreData(oldConfigStoreData, '');
          this.removeOldConfigStoreFile();
        }
      } catch (error) {
        console.log('No data to be imported from Old config file');
      }

      this.set(OLD_CONFIG_BACKUP_FLAG, true);
    }
  }

  setOldConfigStoreData(data, _path = '') {
    for (const key in data) {
      const value = data[key];
      const setPath = _path ? _path + '.' + key : key;

      if (typeof value == 'object') {
        this.setOldConfigStoreData(value, setPath);
      } else {
        this.set(setPath, value);
      }
    }
  }

  isConfigFileValid(configPath: string): boolean {
    try {
      const content = readFileSync(configPath, 'utf8');
      JSON.parse(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  safeDeleteConfigIfInvalid(configFilePath: string) {
    if (existsSync(configFilePath) && !this.isConfigFileValid(configFilePath)) {
      console.warn(chalk.yellow(`Warning: Detected corrupted config at ${configFilePath}. Removing...`));
      unlinkSync(configFilePath);
    }
  }

  removeOldConfigStoreFile() {
    if (existsSync(oldConfigPath)) {
      unlinkSync(oldConfigPath);
    }
  }

  private getOldConfig() {
    try {
      return JSON.parse(readFileSync(oldConfigPath, 'utf8'));
    } catch (error) {
      return undefined;
    }
  }

  private fallbackInit(): Conf {
    return new Conf({ configName: CONFIG_NAME, encryptionKey: ENC_KEY });
  }

  private getObfuscationKey() {
    const obfuscationKeyName = 'obfuscation_key';
    const encConfig = new Conf({ configName: ENC_CONFIG_NAME, cwd });
    let obfuscationKey: any = encConfig?.get(obfuscationKeyName);

    if (!obfuscationKey) {
      encConfig.set(obfuscationKeyName, uuid());
      obfuscationKey = encConfig?.get(obfuscationKeyName);
    }

    return obfuscationKey;
  }

  private getConfigDataAndUnlinkConfigFile(config: Conf) {
    let configData;

    if (config?.path) {
      if (existsSync(config.path)) {
        configData = JSON.parse(JSON.stringify(config?.store || {}));
        unlinkSync(config.path);
      }
    }

    return configData;
  }

  private getEncryptedConfig(configData?: Record<string, unknown>, skip = false) {
    const getEncryptedDataElseFallBack = () => {
      try {
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        const conf = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });

        if (Object.keys(configData || {})?.length) {
          conf.set(configData);
        }
        return conf;
      } catch (error) {
        try {
          const config = this.fallbackInit();
          const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
          return this.getEncryptedConfig(oldConfigData, true);
        } catch (_error) {
          cliux.print(chalk.red('Error: Config file is corrupted'));
          cliux.print(_error);
          process.exit(1);
        }
      }
    };

    try {
      if (skip === false) {
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        const config = new Conf({ configName: CONFIG_NAME });
        const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
        return this.getEncryptedConfig(oldConfigData, true);
      } else {
        return getEncryptedDataElseFallBack();
      }
    } catch (error) {
      return getEncryptedDataElseFallBack();
    }
  }

  private getDecryptedConfig(configData?: Record<string, unknown>) {
    try {
      this.safeDeleteConfigIfInvalid(oldConfigPath);
      const conf = new Conf({ configName: CONFIG_NAME, cwd });

      if (Object.keys(configData || {})?.length) {
        conf.set(configData);
      }
      return conf;
    } catch (error) {
      try {
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        let config = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });
        const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
        return this.getDecryptedConfig(oldConfigData);
      } catch (_error) {
        try {
          const config = this.fallbackInit();
          const _configData = this.getConfigDataAndUnlinkConfigFile(config);
          return this.getDecryptedConfig(_configData);
        } catch (__error) {
          cliux.print(chalk.red('Error: Config file is corrupted'));
          cliux.print(_error);
          process.exit(1);
        }
      }
    }
  }

  /**
   * Gets a value from the configuration.
   * Initializes the config if it hasn't been initialized yet.
   */
  get(key): string | any {
    this.initializeIfNeeded();
    return this.config?.get(key);
  }

  /**
   * Sets a value in the configuration.
   * Initializes the config if it hasn't been initialized yet.
   */
  set(key, value) {
    this.initializeIfNeeded();
    this.config?.set(key, value);
    return this.config;
  }

  /**
   * Deletes a value from the configuration.
   * Initializes the config if it hasn't been initialized yet.
   */
  delete(key) {
    this.initializeIfNeeded();
    this.config?.delete(key);
    return this.config;
  }

  /**
   * Clears all values from the configuration.
   * Initializes the config if it hasn't been initialized yet.
   */
  clear() {
    this.initializeIfNeeded();
    this.config?.clear();
  }
}

// Export the singleton instance
export default Config.getInstance();