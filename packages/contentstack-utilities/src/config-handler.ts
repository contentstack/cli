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

  constructor() {
    this.init();
    this.importOldConfig();
  }

  init() {
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
      this.config = new Conf({ configName: CONFIG_NAME, cwd });

      if (Object.keys(configData || {})?.length) {
        this.config.set(configData); // NOTE set config data if passed any
      }
    } catch (error) {
      // console.trace(error.message)

      try {
        const encryptionKey: any = this.getObfuscationKey();
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
    return this.config?.get(key);
  }

  set(key, value) {
    this.config?.set(key, value);
    return this.config;
  }

  delete(key) {
    this.config?.delete(key);
    return this.config;
  }

  clear() {
    this.config?.clear();
  }
}

export default new Config();
