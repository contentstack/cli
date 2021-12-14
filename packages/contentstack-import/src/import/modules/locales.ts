import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import * as pLimit from 'promise-limit';
import { fileHelper } from '../../utils';

// TBD - master locale should be fetched dynamically and add it part of the config
// TBD - check update locales added with the create itself make sure no side effects
export default class LocalesImport {
  private context: any;
  private stackAPIClient: any;
  private importConfig: any;
  private localeConfig: any;
  private langFolderPath: any;
  private langMapperPath: any;
  private langUidMapperPath: any;

  constructor(context, stackAPIClient, importConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
    this.localeConfig = importConfig.moduleLevelConfig.locales;

    this.langFolderPath = path.resolve(importConfig.backupDir, this.localeConfig.dirName);
    this.langMapperPath = path.resolve(importConfig.backupDir, 'mapper', 'languages');
    this.langUidMapperPath = path.resolve(importConfig.backupDir, 'mapper', 'languages', 'uid-mapper.json');
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.langMapperPath);
      const langauges = await fileHelper.readJSONFile(path.resolve(this.langFolderPath, this.localeConfig.fileName));
      if (!langauges) {
        logger.info('No language found to import');
        return;
      }
      let langUidMapper = {};
      if (await fileHelper.isFolderExist(this.langUidMapperPath)) {
        langUidMapper = (await fileHelper.readJSONFile(this.langUidMapperPath)) || {};
      }

      let langUids = Object.keys(langauges);
      if (!Array.isArray(langUids) || langUids.length <= 0) {
        throw new Error('No Locales found to import');
      }

      // concurrent task runner
      const promiseRunner = pLimit(this.importConfig.concurrency);
      const result = await Promise.all(
        langUids.map(async (langUid) =>
          promiseRunner(() => {
            let language = langauges[langUid];
            if (!langUidMapper.hasOwnProperty(langUid) && language.code !== this.importConfig.masterLocale) {
              language = this.sanitizeAttribs(language);
              return this.createLanguage(langUid, language, langUidMapper);
            }
          }),
        ),
      );
      logger.info('Completed Locales import');
    } catch (error) {
      logger.error('Failed import Locales', error);
    }
  }

  async createLanguage(langUid: string, language: any, langUidMapper: any): Promise<any> {
    const requestOption = {
      locale: { ...language },
    };
    try {
      const languageResponse = await this.stackAPIClient.locale().create(requestOption);
      langUidMapper[langUid] = languageResponse.uid;
      await fileHelper.writeFile(this.langUidMapperPath, langUidMapper);
    } catch (error) {
      logger.error('Failed to create Locale with id' + langUid);
    }
  }

  sanitizeAttribs(language) {
    let updatedLanguage = {};
    this.localeConfig.requiredKeys.forEach((key) => {
      updatedLanguage[key] = language[key];
    });
    return updatedLanguage;
  }
}
