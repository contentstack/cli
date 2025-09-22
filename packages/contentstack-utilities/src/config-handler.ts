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

class Config {
  private config: Conf;
  private inMemoryStore: Map<string, any> = new Map();
  private isPrepackMode: boolean;

  constructor() {
    this.isPrepackMode = this.detectPrepackMode();
    this.init();
    if (!this.isPrepackMode) {
      this.importOldConfig();
    }
  }
  
  private detectPrepackMode(): boolean {
    return !!(
      process.env.npm_package_name || 
      process.env.npm_lifecycle_event === 'prepack' ||
      process.argv.some(arg => arg.includes('oclif') && arg.includes('manifest'))
    );
  }

  init() {
    // Skip file-based config during prepack to prevent race conditions
    if (this.isPrepackMode) {
      // Initialize with empty in-memory store for prepack
      return;
    }
    return ENCRYPT_CONF === true ? this.getEncryptedConfig() : this.getDecryptedConfig();
  }

  importOldConfig() {
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

  // Recursive function to migrate from the old config
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
      unlinkSync(oldConfigPath); // NOTE remove old configstore file
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
        configData = JSON.parse(JSON.stringify(config?.store || {})); // NOTE convert prototype object to plain object
        unlinkSync(config.path); // NOTE remove old config file
      }
    }

    return configData;
  }

  private getEncryptedConfig(configData?: Record<string, unknown>, skip = false) {
    const getEncryptedDataElseFallBack = () => {
      try {
        // NOTE reading current code base encrypted file if exist
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        this.config = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });

        if (Object.keys(configData || {})?.length) {
          this.config.set(configData); // NOTE set config data if passed any
        }
      } catch (error) {
        // NOTE reading old code base encrypted file if exist
        try {
          const config = this.fallbackInit();
          const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
          this.getEncryptedConfig(oldConfigData, true);
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
        this.getEncryptedConfig(oldConfigData, true);
      } else {
        getEncryptedDataElseFallBack();
      }
    } catch (error) {
      // console.trace(error.message)
      // NOTE reading current code base encrypted file if exist
      getEncryptedDataElseFallBack();
    }

    return this.config;
  }

  private getDecryptedConfig(configData?: Record<string, unknown>) {
    try {
      this.safeDeleteConfigIfInvalid(oldConfigPath);
      this.config = new Conf({ configName: CONFIG_NAME, cwd });

      if (Object.keys(configData || {})?.length) {
        this.config.set(configData); // NOTE set config data if passed any
      }
    } catch (error) {
      // console.trace(error.message)

      try {
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        let config = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });
        const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
        this.getDecryptedConfig(oldConfigData); // NOTE NOTE reinitialize the config with old data and new decrypted file
      } catch (_error) {
        // console.trace(error.message)

        try {
          const config = this.fallbackInit();
          const _configData = this.getConfigDataAndUnlinkConfigFile(config);
          this.getDecryptedConfig(_configData); // NOTE reinitialize the config with old data and new decrypted file
        } catch (__error) {
          // console.trace(error.message)
          cliux.print(chalk.red('Error: Config file is corrupted'));
          cliux.print(_error);
          process.exit(1);
        }
      }
    }

    return this.config;
  }

  get(key): string | any {
    if (this.isPrepackMode) {
      return this.inMemoryStore.get(key);
    }
    return this.config?.get(key);
  }

  set(key, value) {
    if (this.isPrepackMode) {
      this.inMemoryStore.set(key, value);
      return this;
    }
    this.config?.set(key, value);
    return this.config;
  }

  delete(key) {
    if (this.isPrepackMode) {
      this.inMemoryStore.delete(key);
      return this;
    }
    this.config?.delete(key);
    return this.config;
  }

  clear() {
    if (this.isPrepackMode) {
      this.inMemoryStore.clear();
      return;
    }
    this.config?.clear();
  }
}

export default new Config();
